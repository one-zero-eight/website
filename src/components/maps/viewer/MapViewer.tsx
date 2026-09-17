import { mapsTypes } from "@/api/maps";
import { useMapImage } from "@/api/maps/map-image.ts";
import {
  MAP_VIEWBOX,
  MAP_VIEWBOX_STRING,
  type GeoControlPoint,
} from "@/components/maps/georeference.ts";
import { DetailsPopup } from "@/components/maps/viewer/DetailsPopup.tsx";
import { GeoControlPointMarkers } from "@/components/maps/viewer/GeoControlPointMarkers.tsx";
import { UserLocationMarker } from "@/components/maps/viewer/UserLocationMarker.tsx";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEventListener } from "usehooks-ts";
import { useNavigate } from "@tanstack/react-router";

// Shared between the two-finger touch drag and the desktop right-click drag,
// so both rotation gestures feel identical.
const ROTATE_DEG_PER_PX = 0.4;

// Wheel deltas don't arrive in comparable units across browsers: Chrome reports
// pixels (~120 per notch), while Firefox reports *lines* for a real mouse wheel
// (deltaMode 1, ~3 per notch). Feeding the raw deltaY into the zoom factor made
// one notch worth ~13% in Chrome but ~0.3% in Firefox — so on Firefox the map
// looked like it had stopped responding to the wheel entirely. 40px per line
// matches Chrome's per-notch delta (3 lines x 40 = 120), the same constant
// MapLibre uses for this.
const WHEEL_PX_PER_LINE = 40;
const WHEEL_PX_PER_PAGE = 400;

const MIN_ZOOM = 0.5;
// Deliberately capped low (it used to be 6). The browser rasterizes the floor
// plan into a texture whose size grows with the zoom factor, and past roughly
// 3x that texture stops fitting the compositor's cache: profiling Firefox
// showed it churning ~750 texture allocations for 74 composites, with single
// uploads blocking for 313ms and frames taking 250ms-1.7s to reach the screen.
const MAX_ZOOM = 3;

function wheelDeltaToPixels(e: WheelEvent) {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE)
    return e.deltaY * WHEEL_PX_PER_LINE;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE)
    return e.deltaY * WHEEL_PX_PER_PAGE;
  return e.deltaY;
}

export type MapUserLocation = {
  /** Position in SVG viewBox units. */
  x: number;
  y: number;
  /** GPS accuracy radius converted to SVG units. */
  accuracyUnits: number;
  heading: number | null;
  /** Whether the dot should actually be drawn (in bounds and accurate enough). */
  visible: boolean;
};

export type MapViewerHandle = {
  /** Resets the map's rotation back to north (bearing 0). */
  resetBearing: () => void;
};

export const MapViewer = memo(
  forwardRef<
    MapViewerHandle,
    {
      scene: mapsTypes.SchemaScene;
      highlightAreas: mapsTypes.SchemaArea[];
      disablePopup?: boolean;
      userLocation?: MapUserLocation | null;
      /** TEMPORARY dev-only: raw `scene.geo_reference` control points to draw for calibration. */
      debugControlPoints?: GeoControlPoint[];
      /** Called (rAF-throttled) whenever the map's rotation changes, in degrees. */
      onBearingChange?: (bearing: number) => void;
    }
  >(function MapViewer(
    {
      scene,
      highlightAreas,
      disablePopup = false,
      userLocation = null,
      debugControlPoints,
      onBearingChange,
    },
    ref,
  ) {
    const navigate = useNavigate();

    const containerRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLDivElement>(null);
    const overlaySvgRef = useRef<SVGSVGElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const options = useRef({
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      bearing: 0,
    });

    // Notify the parent about bearing changes at most once per animation frame,
    // so gesture handlers can keep mutating the ref every event without
    // forcing a React re-render on every mousemove/touchmove.
    const bearingRafIdRef = useRef<number | null>(null);
    const notifyBearingChange = useCallback(() => {
      if (!onBearingChange) return;
      if (bearingRafIdRef.current != null) return;
      bearingRafIdRef.current = requestAnimationFrame(() => {
        bearingRafIdRef.current = null;
        onBearingChange(options.current.bearing);
      });
    }, [onBearingChange]);
    useEffect(
      () => () => {
        if (bearingRafIdRef.current != null) {
          cancelAnimationFrame(bearingRafIdRef.current);
        }
      },
      [],
    );

    // While any gesture is running the hidden bitmap stands in for the live
    // SVG, so the compositor transforms one fixed-size texture instead of
    // re-rasterising every path each frame. Tracked as a set of active
    // gestures because zoom and drag overlap — the wheel's idle timer must not
    // end the swap while a drag is still in progress.
    const bitmapReadyRef = useRef(false);
    const activeGesturesRef = useRef(new Set<string>());
    const wheelIdleTimerRef = useRef<number | null>(null);

    const beginGesture = useCallback((name: string) => {
      const wasIdle = activeGesturesRef.current.size === 0;
      activeGesturesRef.current.add(name);
      if (!wasIdle || !bitmapReadyRef.current) return;
      if (canvasRef.current) canvasRef.current.style.visibility = "visible";
      if (imageRef.current) imageRef.current.style.visibility = "hidden";
    }, []);

    const endGesture = useCallback((name: string) => {
      activeGesturesRef.current.delete(name);
      if (activeGesturesRef.current.size > 0) return;
      if (canvasRef.current) canvasRef.current.style.visibility = "hidden";
      if (imageRef.current) imageRef.current.style.visibility = "";
    }, []);

    // The wheel has no gesture-end event, so fall back to an idle timeout.
    const refreshWheelIdleTimer = useCallback(() => {
      if (wheelIdleTimerRef.current != null) {
        clearTimeout(wheelIdleTimerRef.current);
      }
      wheelIdleTimerRef.current = window.setTimeout(() => {
        wheelIdleTimerRef.current = null;
        endGesture("wheel");
      }, 180);
    }, [endGesture]);

    useEffect(
      () => () => {
        if (wheelIdleTimerRef.current != null) {
          clearTimeout(wheelIdleTimerRef.current);
        }
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        resetBearing: () => {
          options.current.bearing = 0;
          updateImage();
          onBearingChange?.(0);
        },
      }),
      [onBearingChange],
    );

    const { data: mapSvg } = useMapImage(scene.svg_file);
    const mapSvgData = mapSvg?.data;
    const [popupArea, setPopupArea] = useState<mapsTypes.SchemaArea>();
    const [popupIsOpen, setPopupIsOpen] = useState(false);
    const [popupElement, setPopupElement] = useState<Element | null>(null);

    const updateImage = () => {
      if (!containerRef.current || !imageRef.current || !transformRef.current)
        return;
      const rect = containerRef.current.getBoundingClientRect();
      const imageWidth = imageRef.current.clientWidth * options.current.zoom;
      const imageHeight = imageRef.current.clientHeight * options.current.zoom;

      options.current.offsetX = Math.max(
        Math.min(options.current.offsetX, rect.width * 0.8),
        -rect.width * 0.8 - imageWidth + rect.width,
      );

      options.current.offsetY = Math.max(
        Math.min(options.current.offsetY, rect.height * 0.8),
        -rect.height * 0.8 - imageHeight + rect.height,
      );

      transformRef.current.style.transformOrigin = "left top";
      transformRef.current.style.transform = `translate(${options.current.offsetX}px, ${options.current.offsetY}px) scale(${options.current.zoom})`;
      transformRef.current.style.setProperty(
        "--map-zoom",
        String(options.current.zoom),
      );
      transformRef.current.style.setProperty(
        "--map-bearing",
        String(options.current.bearing),
      );

      // Rotation is applied directly to the SVG elements, in place around
      // their own center, instead of folding it into the pan/zoom transform
      // above — cheaper to recomposite than rotating the whole container.
      const rotateTransform = `rotate(${options.current.bearing}deg)`;
      const svgRoot = imageRef.current.firstElementChild as SVGElement | null;
      if (svgRoot) {
        svgRoot.style.transformOrigin = "center";
        svgRoot.style.transform = rotateTransform;
      }
      if (overlaySvgRef.current) {
        overlaySvgRef.current.style.transformOrigin = "center";
        overlaySvgRef.current.style.transform = rotateTransform;
      }
      if (canvasRef.current) {
        canvasRef.current.style.transformOrigin = "center";
        canvasRef.current.style.transform = rotateTransform;
      }
    };

    useEffect(() => {
      // Update on every rerender to match the latest state
      updateImage();
    });

    useEffect(() => {
      if (!containerRef.current || !imageRef.current) return;
      if (options.current.offsetX !== 0 || options.current.offsetY !== 0)
        return;
      // Set initial offset to center the image
      const rect = containerRef.current.getBoundingClientRect();
      const imageWidth = imageRef.current.clientWidth;
      const imageHeight = imageRef.current.clientHeight;
      options.current.offsetX = (rect.width - imageWidth) / 2;
      options.current.offsetY = (rect.height - imageHeight) / 2;
      updateImage();
    }, []);

    // Support panning using mouse
    useEventListener(
      "mousedown",
      (e) => {
        if (e.button !== 0) return; // Left button only; right button rotates
        e.preventDefault();
        if (!containerRef.current) return;

        containerRef.current.style.cursor = "grabbing";

        const startX = e.clientX;
        const startY = e.clientY;
        const startOffsetX = options.current.offsetX;
        const startOffsetY = options.current.offsetY;
        const onMouseMove = (e: MouseEvent) => {
          // Swapped in on first movement rather than on mousedown, so a plain
          // click on a room doesn't flash the bitmap.
          beginGesture("drag");
          options.current.offsetX = startOffsetX + e.clientX - startX;
          options.current.offsetY = startOffsetY + e.clientY - startY;
          updateImage();
        };
        const onMouseUp = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          endGesture("drag");
          if (containerRef.current) {
            containerRef.current.style.cursor = "grab";
          }
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      },
      containerRef as React.RefObject<HTMLDivElement>,
    );

    // Support zooming using mouse wheel
    useEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (!containerRef.current) return;

        beginGesture("wheel");
        refreshWheelIdleTimer();

        // Should zoom to the center of the wheel event
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const oldZoom = options.current.zoom;
        const newZoom = Math.min(
          Math.max(oldZoom * Math.pow(1.001, -wheelDeltaToPixels(e)), MIN_ZOOM),
          MAX_ZOOM,
        );
        const zoomRatio = newZoom / oldZoom;
        options.current.zoom = newZoom;
        options.current.offsetX =
          mouseX - (mouseX - options.current.offsetX) * zoomRatio;
        options.current.offsetY =
          mouseY - (mouseY - options.current.offsetY) * zoomRatio;
        updateImage();
      },
      containerRef as React.RefObject<HTMLDivElement>,
      { passive: false }, // Prevent page scrolling
    );

    // Support panning using touches
    useEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (e.touches.length !== 1) return;

        const startX = e.touches[0].clientX;
        const startY = e.touches[0].clientY;
        const startOffsetX = options.current.offsetX;
        const startOffsetY = options.current.offsetY;
        const onTouchMove = (e: TouchEvent) => {
          beginGesture("touch-pan");
          options.current.offsetX =
            startOffsetX + e.touches[0].clientX - startX;
          options.current.offsetY =
            startOffsetY + e.touches[0].clientY - startY;
          updateImage();
        };
        const onTouchEnd = () => {
          window.removeEventListener("touchmove", onTouchMove);
          window.removeEventListener("touchend", onTouchEnd);
          endGesture("touch-pan");
        };
        window.addEventListener("touchmove", onTouchMove);
        window.addEventListener("touchend", onTouchEnd);
      },
      containerRef as React.RefObject<HTMLDivElement>,
      { passive: false }, // Prevent page scrolling
    );

    // Support zooming (pinch) and rotating (twisting) using two touches
    useEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (!containerRef.current) return;
        if (e.touches.length !== 2) return;

        // Zoom is anchored to where the gesture started, so finger movement
        // doesn't pan the map — only the pinch distance and twist angle matter.
        const rect = containerRef.current.getBoundingClientRect();
        const startOffsetX = options.current.offsetX;
        const startOffsetY = options.current.offsetY;
        const startBearing = options.current.bearing;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
        const oldZoom = options.current.zoom;
        const oldDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );
        const startAngle = Math.atan2(
          touch2.clientY - touch1.clientY,
          touch2.clientX - touch1.clientX,
        );
        const onTouchMove = (e: TouchEvent) => {
          e.preventDefault();
          if (e.touches.length !== 2) return;

          beginGesture("pinch");
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const newDistance = Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY,
          );
          const newZoom = Math.min(
            Math.max(oldZoom * (newDistance / oldDistance), MIN_ZOOM),
            MAX_ZOOM,
          );
          const zoomRatio = newZoom / oldZoom;
          const newAngle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX,
          );

          options.current.zoom = newZoom;
          options.current.offsetX =
            centerX - (centerX - startOffsetX) * zoomRatio;
          options.current.offsetY =
            centerY - (centerY - startOffsetY) * zoomRatio;
          options.current.bearing =
            startBearing + ((newAngle - startAngle) * 180) / Math.PI;
          updateImage();
          notifyBearingChange();
        };
        const onTouchEnd = () => {
          window.removeEventListener("touchmove", onTouchMove);
          window.removeEventListener("touchend", onTouchEnd);
          endGesture("pinch");
        };
        window.addEventListener("touchmove", onTouchMove);
        window.addEventListener("touchend", onTouchEnd);
      },
      containerRef as React.RefObject<HTMLDivElement>,
      { passive: false }, // Prevent page scrolling
    );

    // Right mouse button is repurposed for rotating, so suppress the native context menu
    useEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
      },
      containerRef as React.RefObject<HTMLDivElement>,
    );

    // Support rotating using right-click-drag
    useEventListener(
      "mousedown",
      (e) => {
        if (e.button !== 2) return;
        e.preventDefault();
        if (!containerRef.current) return;

        const startX = e.clientX;
        const startBearing = options.current.bearing;

        const onMouseMove = (e: MouseEvent) => {
          beginGesture("rotate");
          const deltaBearingDeg = (e.clientX - startX) * ROTATE_DEG_PER_PX;
          options.current.bearing = startBearing + deltaBearingDeg;
          updateImage();
          notifyBearingChange();
        };
        const onMouseUp = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          endGesture("rotate");
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      },
      containerRef as React.RefObject<HTMLDivElement>,
    );

    // Detect area clicks using mouse
    useEventListener(
      "mousedown",
      (e) => {
        if (e.button !== 0) return;
        if (disablePopup) return;

        const onMouseUp = (e2: MouseEvent) => {
          window.removeEventListener("mouseup", onMouseUp);

          // If the coordinates almost did not change, assume it is a click
          if (
            Math.abs(e.clientX - e2.clientX) <= 15 &&
            Math.abs(e.clientY - e2.clientY) <= 15
          ) {
            // Find the nearest element with id
            const el = (e.target as HTMLElement | null)?.closest("[id]");
            // Find matching area
            const area = scene.areas?.find((a) => a.svg_polygon_id === el?.id);
            if (!el || !area) return;

            // Follow the scene pointer
            if (area.scene_pointer) {
              navigate({
                to: `/maps?&scene=${area.scene_pointer}`,
                replace: true, // Do not add useless history entries not to break the back button
              });
              return;
            }

            // Show popup
            setPopupElement(el);
            setPopupArea(area);
            setPopupIsOpen(true);
          }
        };
        window.addEventListener("mouseup", onMouseUp);
      },
      containerRef as React.RefObject<HTMLDivElement>,
    );

    // Detect area clicks using touches
    useEventListener(
      "touchstart",
      (e) => {
        if (disablePopup) return;
        if (e.touches.length !== 1) return;

        const onTouchEnd = (e2: TouchEvent) => {
          window.removeEventListener("touchend", onTouchEnd);
          if (e2.touches.length !== 0) return;
          console.log(e2.changedTouches);

          // If the coordinates almost did not change, assume it is a click
          if (
            Math.abs(e.touches[0].clientX - e2.changedTouches[0].clientX) <=
              15 &&
            Math.abs(e.touches[0].clientY - e2.changedTouches[0].clientY) <= 15
          ) {
            // Find the nearest element with id
            const el = (e.target as HTMLElement | null)?.closest("[id]");
            // Find matching area
            const area = scene.areas?.find((a) => a.svg_polygon_id === el?.id);
            if (!el || !area) return;

            // Show popup
            setPopupElement(el);
            setPopupArea(area);
            setPopupIsOpen(true);
          } else {
            setPopupIsOpen(false);
          }
        };
        window.addEventListener("touchend", onTouchEnd);
      },
      containerRef as React.RefObject<HTMLDivElement>,
    );

    // Center to the highlighted areas when they change
    useEffect(() => {
      if (!highlightAreas.length) return;
      if (!containerRef.current || !imageRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const imageRect = imageRef.current.getBoundingClientRect();

      const areaIds = highlightAreas.map((s) => s.svg_polygon_id ?? undefined);
      const areas = areaIds.map((id) =>
        imageRef.current?.querySelector(`[id="${id}"]`),
      );
      const areasRect: DOMRect[] = areas
        .map((area) => area?.getBoundingClientRect())
        .filter((r) => r !== undefined);
      if (!areasRect.length) return;

      const minX = Math.min(
        ...areasRect.map(
          (r) => (r.left - imageRect.left) / options.current.zoom,
        ),
      );
      const minY = Math.min(
        ...areasRect.map((r) => (r.top - imageRect.top) / options.current.zoom),
      );
      const maxX = Math.max(
        ...areasRect.map(
          (r) => (r.right - imageRect.left) / options.current.zoom,
        ),
      );
      const maxY = Math.max(
        ...areasRect.map(
          (r) => (r.bottom - imageRect.top) / options.current.zoom,
        ),
      );

      const zoomX = rect.width / (maxX - minX + 50);
      const zoomY = rect.height / (maxY - minY + 50);
      const zoom = Math.min(
        Math.max(Math.min(zoomX, zoomY), MIN_ZOOM),
        MAX_ZOOM,
      );

      const areaCenterX = minX + (maxX - minX) / 2;
      const areaCenterY = minY + (maxY - minY) / 2;

      const offsetX = rect.width / 2 - areaCenterX * zoom;
      const offsetY = rect.height / 2 - areaCenterY * zoom;

      options.current.offsetX = offsetX;
      options.current.offsetY = offsetY;
      options.current.zoom = zoom;
      options.current.bearing = 0;
      updateImage();
      notifyBearingChange();

      // Show popup
      if (highlightAreas.length === 1) {
        const area = highlightAreas[0];
        const el = imageRef.current?.querySelector(
          `[id="${area.svg_polygon_id}"]`,
        );
        if (el) {
          setPopupElement(el);
          setPopupArea(area);
          setPopupIsOpen(true);
        } else {
          setPopupIsOpen(false);
        }
      }
    }, [scene, highlightAreas, mapSvg?.data, notifyBearingChange]);

    // Convert a point in SVG viewBox units to pixel coords within the image div
    // (the map SVG fills the div with preserveAspectRatio="xMidYMid meet").
    const mapPointToImagePixels = (x: number, y: number) => {
      if (!imageRef.current) return null;
      const w = imageRef.current.clientWidth;
      const h = imageRef.current.clientHeight;
      const scale = Math.min(w / MAP_VIEWBOX.width, h / MAP_VIEWBOX.height);
      return {
        px:
          (x - MAP_VIEWBOX.minX) * scale + (w - MAP_VIEWBOX.width * scale) / 2,
        py:
          (y - MAP_VIEWBOX.minY) * scale + (h - MAP_VIEWBOX.height * scale) / 2,
      };
    };

    // Center on the user location the first time we get a usable fix
    const centeredForLocationRef = useRef(false);
    useEffect(() => {
      if (!userLocation) {
        centeredForLocationRef.current = false;
        return;
      }
      // Keep the map framed on a searched/linked room instead of jumping to GPS.
      if (highlightAreas.length) return;
      if (!userLocation.visible || centeredForLocationRef.current) return;
      if (!containerRef.current || !imageRef.current) return;

      const pix = mapPointToImagePixels(userLocation.x, userLocation.y);
      if (!pix) return;

      const rect = containerRef.current.getBoundingClientRect();
      const zoom = Math.min(Math.max(options.current.zoom, 2), MAX_ZOOM);
      options.current.zoom = zoom;
      options.current.offsetX = rect.width / 2 - pix.px * zoom;
      options.current.offsetY = rect.height / 2 - pix.py * zoom;
      options.current.bearing = 0;
      updateImage();
      notifyBearingChange();
      centeredForLocationRef.current = true;
    }, [userLocation, highlightAreas, notifyBearingChange]);

    // Rasterise the floor plan into a fixed-size canvas, kept hidden until a
    // gesture starts. Live SVG has to be re-rasterised by the compositor at
    // whatever scale the transform currently says, so panning/zooming/rotating
    // it re-renders every vector path every frame; a canvas is one texture of
    // a fixed size that costs the same to transform at any zoom.
    //
    // Keyed on a string rather than the highlightAreas array, whose identity
    // changes on every render — depending on the array itself would re-encode
    // the whole SVG on every frame of a gesture.
    const highlightKey = highlightAreas.map((a) => a.svg_polygon_id).join(",");
    useEffect(() => {
      if (!mapSvgData) return;
      bitmapReadyRef.current = false;
      let cancelled = false;
      let resizeTimer: number | null = null;

      const rasterise = () => {
        const canvas = canvasRef.current;
        const box = imageRef.current;
        if (cancelled || !canvas || !box) return;
        const boxWidth = box.clientWidth;
        const boxHeight = box.clientHeight;
        // Nothing laid out yet; the ResizeObserver below will call back.
        if (!boxWidth || !boxHeight) return;

        // Page CSS doesn't reach an SVG loaded as an image, so the highlight
        // fill has to be baked into the markup or highlighted rooms would lose
        // their colour for as long as the gesture lasts. The pulse animation is
        // dropped on purpose — a static raster can't animate it anyway.
        const selector = highlightKey
          ? highlightKey
              .split(",")
              .map((id) => `[id="${id}"]`)
              .join(",")
          : "";
        const markup = selector
          ? mapSvgData.replace(
              /(<svg\b[^>]*>)/,
              `$1<style>${selector}{fill:violet;opacity:0.35}</style>`,
            )
          : mapSvgData;

        const url = URL.createObjectURL(
          new Blob([markup], { type: "image/svg+xml" }),
        );
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          if (cancelled) return;
          // Oversample a little so the bitmap still reads acceptably a couple
          // of zoom steps in, while staying bounded instead of growing with
          // zoom the way the live SVG's surface does.
          const scale = Math.min(2 * (window.devicePixelRatio || 1), 3);
          canvas.width = Math.round(boxWidth * scale);
          canvas.height = Math.round(boxHeight * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Reproduce how the live SVG fits its box (preserveAspectRatio
          // defaults to xMidYMid meet): scale to fit, then centre. The canvas
          // shares the box's aspect ratio, so the two line up exactly.
          const aspect =
            img.naturalWidth && img.naturalHeight
              ? img.naturalWidth / img.naturalHeight
              : canvas.width / canvas.height;
          const drawn =
            canvas.width / canvas.height > aspect
              ? { w: canvas.height * aspect, h: canvas.height }
              : { w: canvas.width, h: canvas.width / aspect };
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            (canvas.width - drawn.w) / 2,
            (canvas.height - drawn.h) / 2,
            drawn.w,
            drawn.h,
          );
          bitmapReadyRef.current = true;
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
      };

      rasterise();

      // The box has no size on the first pass, and changes on fullscreen or
      // window resize; re-rasterise so the bitmap keeps matching its aspect.
      const observer = new ResizeObserver(() => {
        if (resizeTimer != null) clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(rasterise, 100);
      });
      if (imageRef.current) observer.observe(imageRef.current);

      return () => {
        cancelled = true;
        if (resizeTimer != null) clearTimeout(resizeTimer);
        observer.disconnect();
      };
    }, [mapSvgData, highlightKey]);

    const svgDiv = useMemo(
      () =>
        mapSvgData ? (
          <div
            ref={imageRef}
            dangerouslySetInnerHTML={{ __html: mapSvgData }}
            className="h-full w-full [&>svg]:h-full! [&>svg]:w-full! [&>svg]:overflow-visible"
          />
        ) : null,
      [mapSvgData],
    );

    return (
      <div
        ref={containerRef}
        className="bg-base-100 dark:bg-base-content flex h-full max-h-full w-full cursor-grab overflow-hidden"
      >
        <style type="text/css">
          {highlightAreas?.length
            ? `
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        ${highlightAreas.map((s) => `[id="${s.svg_polygon_id}"]`).join(",")} {
          fill: violet !important;
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        `
            : ""}
        </style>
        <style type="text/css">
          {`
        ${scene.areas?.map((a) => `[id="${a.svg_polygon_id}"]`).join(",")} {
          cursor: ${disablePopup ? "default" : "pointer"};
        }
        ${
          !disablePopup
            ? scene.areas
                ?.map((a) => `[id="${a.svg_polygon_id}"]:hover`)
                .join(",") +
              ` {
          opacity: 0.2 !important;
          fill: violet !important;
        }`
            : ""
        }
        `}
        </style>
        <div ref={transformRef} className="relative h-full w-full">
          {svgDiv}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ visibility: "hidden" }}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
          {(userLocation || debugControlPoints?.length) && (
            <svg
              ref={overlaySvgRef}
              viewBox={MAP_VIEWBOX_STRING}
              preserveAspectRatio="xMidYMid meet"
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            >
              {debugControlPoints && debugControlPoints.length > 0 && (
                <GeoControlPointMarkers points={debugControlPoints} />
              )}
              {userLocation?.visible && (
                <UserLocationMarker
                  x={userLocation.x}
                  y={userLocation.y}
                  accuracyUnits={userLocation.accuracyUnits}
                  heading={userLocation.heading}
                />
              )}
            </svg>
          )}
        </div>
        {!disablePopup && (
          <DetailsPopup
            elementRef={popupElement}
            scene={scene}
            area={popupArea}
            isOpen={popupIsOpen}
            setIsOpen={setPopupIsOpen}
          />
        )}
      </div>
    );
  }),
);
