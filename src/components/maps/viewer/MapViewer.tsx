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
import gsap from "gsap";
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
/**
 * How far (degrees) two fingers must twist before a pinch starts rotating the
 * map, so zooming alone does not tilt it by accident.
 */
const ROTATE_MOBILE_THRESHOLD = 30;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;

/** Duration/easing for the scripted camera moves (reset north, fly to a room). */
const FLY_DURATION = 0.6;
const FLY_EASE = "power2.out";

/**
 * How far past the edge of the floor plan the view centre may travel, as a
 * fraction of the plan's size. Expressed against the (unrotated) world box, so
 * unlike a screen-space offset clamp it behaves identically at every bearing.
 */
const PAN_MARGIN_RATIO = 0.4;

const DEG2RAD = Math.PI / 180;

/**
 * Wheel deltas arrive in different units per browser: Chrome reports pixels
 * (~100-120 a notch), Firefox reports lines (~3 a notch) and some setups report
 * pages. Feeding the raw number into the zoom curve made one Firefox notch
 * worth ~0.3% zoom against Chrome's ~11%, which looks exactly like the map
 * refusing to zoom at all. Normalise to pixels first.
 */
const WHEEL_LINE_HEIGHT_PX = 40;
const WHEEL_PAGE_HEIGHT_PX = 800;
const wheelDeltaToPixels = (e: WheelEvent) => {
  if (e.deltaMode === 1) return e.deltaY * WHEEL_LINE_HEIGHT_PX;
  if (e.deltaMode === 2) return e.deltaY * WHEEL_PAGE_HEIGHT_PX;
  return e.deltaY;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Fold a bearing into (-180, 180] so tweens always take the short way round. */
const normalizeBearing = (deg: number) => {
  const wrapped = ((deg % 360) + 540) % 360;
  return wrapped - 180;
};

type Vec2 = { x: number; y: number };

/**
 * The map is driven as a camera rather than as a pile of independent
 * transforms: `centerX`/`centerY` is the point of the floor plan sitting under
 * the middle of the viewport, and the view is rotated and scaled about that
 * same point. Rotation therefore always pivots on whatever the user is looking
 * at, and pan/zoom/rotate compose into one transform instead of fighting for
 * separate origins on separate elements.
 *
 * World units are pixels of the untransformed image div (which fills the
 * container, with the floor-plan SVG letterboxed inside it via
 * preserveAspectRatio), so world == screen at zoom 1, bearing 0, centred.
 *
 * GSAP owns this object: gestures write to it directly, scripted moves tween
 * it, and `applyCamera` is the single place it reaches the DOM.
 */
type Camera = {
  centerX: number;
  centerY: number;
  zoom: number;
  bearing: number;
};

export type MapUserLocation = {
  /** Position in SVG viewBox units. */
  x: number;
  y: number;
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
    const camera = useRef<Camera>({
      centerX: 0,
      centerY: 0,
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
        onBearingChange(camera.current.bearing);
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

    const { data: mapSvg } = useMapImage(scene.svg_file);
    const mapSvgData = mapSvg?.data;
    const [popupArea, setPopupArea] = useState<mapsTypes.SchemaArea>();
    const [popupIsOpen, setPopupIsOpen] = useState(false);
    const [popupElement, setPopupElement] = useState<Element | null>(null);

    /**
     * Container geometry, cached. Every gesture needs it, and reading it from
     * the DOM (getBoundingClientRect / clientWidth) forces a synchronous layout
     * of a document holding a ~600-element SVG. Doing that between transform
     * writes is layout thrashing, and wheel events arrive faster than 60Hz, so
     * it was happening well over a hundred times a second. None of these values
     * change while panning, zooming or rotating - only on resize or scroll.
     */
    const layoutRef = useRef({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      imageWidth: 0,
      imageHeight: 0,
    });
    const measureLayout = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      layoutRef.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        imageWidth: imageRef.current?.clientWidth ?? rect.width,
        imageHeight: imageRef.current?.clientHeight ?? rect.height,
      };
    }, []);

    /** Keep the view centre near the floor plan so the map can never be lost. */
    const clampCenter = useCallback(() => {
      const { imageWidth: width, imageHeight: height } = layoutRef.current;
      if (!width || !height) return;
      const marginX = width * PAN_MARGIN_RATIO;
      const marginY = height * PAN_MARGIN_RATIO;
      const cam = camera.current;
      cam.centerX = clamp(cam.centerX, -marginX, width + marginX);
      cam.centerY = clamp(cam.centerY, -marginY, height + marginY);
    }, []);

    /**
     * Push the camera to the DOM as GSAP transform properties.
     *
     * GSAP composes these as `translate(x, y) rotate(rotation) scale(scale)`
     * about `transformOrigin`. Pinning the origin at the top-left keeps it
     * constant (GSAP has to do extra work when transformOrigin changes), so the
     * "rotate about the view centre" part is folded into x/y instead: place the
     * already-rotated, already-scaled centre point under the middle of the
     * viewport.
     */
    const applyCamera = useCallback(() => {
      if (!transformRef.current) return;
      clampCenter();
      const { centerX, centerY, zoom, bearing } = camera.current;
      const { width, height } = layoutRef.current;
      const cos = Math.cos(bearing * DEG2RAD);
      const sin = Math.sin(bearing * DEG2RAD);
      gsap.set(transformRef.current, {
        transformOrigin: "0 0",
        x: width / 2 - zoom * (centerX * cos - centerY * sin),
        y: height / 2 - zoom * (centerX * sin + centerY * cos),
        rotation: bearing,
        scale: zoom,
        "--map-zoom": String(zoom),
        "--map-bearing": String(bearing),
      });
    }, [clampCenter]);

    /**
     * Screen (client) coordinates -> world. Inverts the camera arithmetically
     * instead of asking the DOM for the live matrix, so it costs nothing and
     * can be called inside a wheel handler without forcing layout.
     */
    const toWorld = useCallback((clientX: number, clientY: number): Vec2 => {
      const cam = camera.current;
      const { left, top, width, height } = layoutRef.current;
      const screenX = clientX - left - width / 2;
      const screenY = clientY - top - height / 2;
      const cos = Math.cos(-cam.bearing * DEG2RAD);
      const sin = Math.sin(-cam.bearing * DEG2RAD);
      return {
        x: cam.centerX + (screenX * cos - screenY * sin) / cam.zoom,
        y: cam.centerY + (screenX * sin + screenY * cos) / cam.zoom,
      };
    }, []);

    /**
     * Move the centre so `world` renders under the given client point, leaving
     * zoom and bearing untouched. This is the one primitive behind every
     * anchored gesture: drag pins the grabbed point to the cursor, wheel zoom
     * pins the point under the pointer, pinch pins the point under the
     * two-finger centroid.
     *
     * Derived from the camera object rather than by re-reading the DOM, so
     * dragging never forces a synchronous layout.
     */
    const anchorWorldTo = useCallback(
      (world: Vec2, clientX: number, clientY: number) => {
        const cam = camera.current;
        const { left, top, width, height } = layoutRef.current;
        const screenX = clientX - left - width / 2;
        const screenY = clientY - top - height / 2;
        // Undo rotation and zoom to turn that screen offset into world units.
        const cos = Math.cos(-cam.bearing * DEG2RAD);
        const sin = Math.sin(-cam.bearing * DEG2RAD);
        cam.centerX = world.x - (screenX * cos - screenY * sin) / cam.zoom;
        cam.centerY = world.y - (screenX * sin + screenY * cos) / cam.zoom;
      },
      [],
    );

    /** Hand the camera to a gesture: stop any scripted move fighting the user. */
    const takeCameraControl = useCallback(() => {
      gsap.killTweensOf(camera.current);
    }, []);

    /** Animate the camera to a new pose (reset north, frame a room, ...). */
    const flyTo = useCallback(
      (target: Partial<Camera>) => {
        gsap.killTweensOf(camera.current);
        // Normalise first so a reset from 350deg sweeps -10 -> 0, not the long
        // way round, and lands on exactly 0 rather than 360.
        camera.current.bearing = normalizeBearing(camera.current.bearing);
        gsap.to(camera.current, {
          ...target,
          duration: FLY_DURATION,
          ease: FLY_EASE,
          onUpdate: () => {
            applyCamera();
            notifyBearingChange();
          },
          onComplete: notifyBearingChange,
        });
      },
      [applyCamera, notifyBearingChange],
    );

    useEffect(() => {
      const cameraObject = camera.current;
      return () => {
        gsap.killTweensOf(cameraObject);
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        // Bearing alone: because the camera rotates about its own centre,
        // sweeping back to north keeps the current view framed exactly as it is.
        resetBearing: () => flyTo({ bearing: 0 }),
      }),
      [flyTo],
    );

    // Refresh the cached geometry when it can actually change. Never per frame.
    useEffect(() => {
      measureLayout();
      applyCamera();
      const onScroll = () => measureLayout();
      const observer = new ResizeObserver(() => {
        measureLayout();
        applyCamera();
      });
      if (containerRef.current) observer.observe(containerRef.current);
      if (imageRef.current) observer.observe(imageRef.current);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", onScroll);
      };
    }, [mapSvgData, measureLayout, applyCamera]);

    useEffect(() => {
      // Update on every rerender to match the latest state
      applyCamera();
    });

    const centeredInitiallyRef = useRef(false);
    useEffect(() => {
      if (centeredInitiallyRef.current) return;
      if (!imageRef.current) return;
      const width = imageRef.current.clientWidth;
      const height = imageRef.current.clientHeight;
      if (!width || !height) return;
      // Start centred on the middle of the floor plan, with no animation.
      gsap.set(camera.current, { centerX: width / 2, centerY: height / 2 });
      centeredInitiallyRef.current = true;
      applyCamera();
    }, [mapSvgData, applyCamera]);

    // Support panning using mouse
    useEventListener(
      "mousedown",
      (e) => {
        if (e.button !== 0) return; // Left button only; right button rotates
        e.preventDefault();
        if (!containerRef.current) return;

        takeCameraControl();
        containerRef.current.style.cursor = "grabbing";

        // Pin the grabbed point to the cursor. Working in world space means the
        // map follows the pointer correctly even when it is rotated, which a
        // raw screen-space offset delta does not.
        const grabbed = toWorld(e.clientX, e.clientY);
        const onMouseMove = (e: MouseEvent) => {
          anchorWorldTo(grabbed, e.clientX, e.clientY);
          applyCamera();
        };
        const onMouseUp = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          if (containerRef.current) {
            containerRef.current.style.cursor = "grab";
          }
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      },
      containerRef as React.RefObject<HTMLDivElement>,
    );

    // Support zooming using mouse wheel.
    //
    // Wheel events fire far more often than the screen refreshes - a trackpad
    // or smooth-scroll mouse emits well over 100 a second - so applying each
    // one immediately meant writing the transform (and re-rendering the SVG)
    // many times per frame for a single visible update. Deltas are accumulated
    // and flushed once per animation frame instead.
    const wheelRafRef = useRef<number | null>(null);
    const wheelPendingRef = useRef({ deltaPx: 0, clientX: 0, clientY: 0 });
    useEffect(
      () => () => {
        if (wheelRafRef.current != null) {
          cancelAnimationFrame(wheelRafRef.current);
        }
      },
      [],
    );
    useEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (!containerRef.current) return;

        takeCameraControl();
        const pending = wheelPendingRef.current;
        pending.deltaPx += wheelDeltaToPixels(e);
        pending.clientX = e.clientX;
        pending.clientY = e.clientY;
        if (wheelRafRef.current != null) return;

        wheelRafRef.current = requestAnimationFrame(() => {
          wheelRafRef.current = null;
          const { deltaPx, clientX, clientY } = wheelPendingRef.current;
          wheelPendingRef.current.deltaPx = 0;
          // Keep whatever is under the pointer pinned there while zooming.
          const anchor = toWorld(clientX, clientY);
          camera.current.zoom = clamp(
            camera.current.zoom * Math.pow(1.001, -deltaPx),
            MIN_ZOOM,
            MAX_ZOOM,
          );
          anchorWorldTo(anchor, clientX, clientY);
          applyCamera();
        });
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

        takeCameraControl();
        const grabbed = toWorld(e.touches[0].clientX, e.touches[0].clientY);
        const onTouchMove = (e: TouchEvent) => {
          if (e.touches.length !== 1) return;
          anchorWorldTo(grabbed, e.touches[0].clientX, e.touches[0].clientY);
          applyCamera();
        };
        const onTouchEnd = () => {
          window.removeEventListener("touchmove", onTouchMove);
          window.removeEventListener("touchend", onTouchEnd);
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

        takeCameraControl();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const startZoom = camera.current.zoom;
        const startBearing = camera.current.bearing;
        const startDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );
        const startAngle = Math.atan2(
          touch2.clientY - touch1.clientY,
          touch2.clientX - touch1.clientX,
        );
        // Finger angle at which rotation kicked in, or null while the twist is
        // still under ROTATE_MOBILE_THRESHOLD. Measuring from this point
        // instead of startAngle keeps the map from jumping when it unlocks.
        let rotationStartAngle: number | null = null;
        // The world point under the initial centroid stays under the centroid
        // for the whole gesture, so the map tracks the fingers.
        const anchor = toWorld(
          (touch1.clientX + touch2.clientX) / 2,
          (touch1.clientY + touch2.clientY) / 2,
        );

        const onTouchMove = (e: TouchEvent) => {
          e.preventDefault();
          if (e.touches.length !== 2) return;

          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const distance = Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY,
          );
          const angle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX,
          );

          camera.current.zoom = clamp(
            startZoom * (distance / startDistance),
            MIN_ZOOM,
            MAX_ZOOM,
          );
          if (
            rotationStartAngle === null &&
            Math.abs(normalizeBearing((angle - startAngle) / DEG2RAD)) >
              ROTATE_MOBILE_THRESHOLD
          ) {
            rotationStartAngle = angle;
          }
          if (rotationStartAngle !== null) {
            camera.current.bearing =
              startBearing + (angle - rotationStartAngle) / DEG2RAD;
          }
          anchorWorldTo(
            anchor,
            (touch1.clientX + touch2.clientX) / 2,
            (touch1.clientY + touch2.clientY) / 2,
          );
          applyCamera();
          notifyBearingChange();
        };
        const onTouchEnd = () => {
          window.removeEventListener("touchmove", onTouchMove);
          window.removeEventListener("touchend", onTouchEnd);
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

        takeCameraControl();
        const startX = e.clientX;
        const startBearing = camera.current.bearing;

        const onMouseMove = (e: MouseEvent) => {
          // No anchoring needed: the camera pivots on its own centre, so
          // changing the bearing spins the view around what is on screen.
          camera.current.bearing =
            startBearing + (e.clientX - startX) * ROTATE_DEG_PER_PX;
          applyCamera();
          notifyBearingChange();
        };
        const onMouseUp = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
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

      const areaIds = highlightAreas.map((s) => s.svg_polygon_id ?? undefined);
      const areas = areaIds.map((id) =>
        imageRef.current?.querySelector(`[id="${id}"]`),
      );
      const areasRect: DOMRect[] = areas
        .map((area) => area?.getBoundingClientRect())
        .filter((r) => r !== undefined);
      if (!areasRect.length) return;

      // Pull the on-screen rects back into world space through the current
      // camera, so the framing maths does not care what the bearing was.
      const corners = areasRect.flatMap((r) => [
        toWorld(r.left, r.top),
        toWorld(r.right, r.top),
        toWorld(r.right, r.bottom),
        toWorld(r.left, r.bottom),
      ]);
      const minX = Math.min(...corners.map((p) => p.x));
      const minY = Math.min(...corners.map((p) => p.y));
      const maxX = Math.max(...corners.map((p) => p.x));
      const maxY = Math.max(...corners.map((p) => p.y));

      const zoomX = rect.width / (maxX - minX + 50);
      const zoomY = rect.height / (maxY - minY + 50);

      const target = {
        zoom: clamp(Math.min(zoomX, zoomY), MIN_ZOOM, 4),
        centerX: minX + (maxX - minX) / 2,
        centerY: minY + (maxY - minY) / 2,
        bearing: 0,
      };
      if (centeredInitiallyRef.current) {
        flyTo(target);
      } else {
        // Nothing to animate from on first paint - just be there.
        gsap.set(camera.current, target);
        centeredInitiallyRef.current = true;
        applyCamera();
        notifyBearingChange();
      }

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
    }, [
      scene,
      highlightAreas,
      mapSvg?.data,
      notifyBearingChange,
      applyCamera,
      toWorld,
      flyTo,
    ]);

    // Convert a point in SVG viewBox units to world units (pixels within the
    // untransformed image div, where the map SVG is letterboxed by
    // preserveAspectRatio="xMidYMid meet").
    const mapPointToWorld = useCallback((x: number, y: number): Vec2 | null => {
      if (!imageRef.current) return null;
      const w = imageRef.current.clientWidth;
      const h = imageRef.current.clientHeight;
      const scale = Math.min(w / MAP_VIEWBOX.width, h / MAP_VIEWBOX.height);
      return {
        x: (x - MAP_VIEWBOX.minX) * scale + (w - MAP_VIEWBOX.width * scale) / 2,
        y:
          (y - MAP_VIEWBOX.minY) * scale + (h - MAP_VIEWBOX.height * scale) / 2,
      };
    }, []);

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

      const target = mapPointToWorld(userLocation.x, userLocation.y);
      if (!target) return;

      centeredForLocationRef.current = true;
      flyTo({
        centerX: target.x,
        centerY: target.y,
        zoom: clamp(camera.current.zoom, 2, 4),
        bearing: 0,
      });
    }, [userLocation, highlightAreas, mapPointToWorld, flyTo]);

    const svgDiv = useMemo(
      () =>
        mapSvgData ? (
          <div
            ref={imageRef}
            dangerouslySetInnerHTML={{ __html: mapSvgData }}
            className="h-full w-full [transform-style:preserve-3d] [&>svg]:h-full! [&>svg]:w-full! [&>svg]:[text-rendering:geometricPrecision]"
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
        {/* preserve-3d establishes a 3D rendering context, which keeps this
            subtree on its own compositing layer: rotating and zooming then move
            a cached layer instead of making the browser re-render the whole
            vector tree every frame. Measured in Firefox at zoom 3, median frame
            time rotating: 822ms without it, 17ms with it on both this wrapper
            and the image div below. On a zoom sweep it flattens the spikes:
            p95 135ms -> 18ms.

            The image div also sets text-rendering: geometricPrecision. Inside a
            composited layer the glyphs are re-hinted onto a new pixel grid each
            time the scale changes, which reads as the labels sliding around
            while zooming; geometricPrecision turns hinting off so they scale
            geometrically (and it steadies frame times too: rotate p95 65ms ->
            18ms).

            Deliberately NOT will-change: transform. On its own it measured
            *worse* than no hint at all (714ms), which is the likely reason the
            earlier "optimize maps for firefox users" attempt was reverted. */}
        <div
          ref={transformRef}
          className="relative h-full w-full [transform-style:preserve-3d] [&>svg]:[text-rendering:geometricPrecision]"
        >
          {svgDiv}
          {(userLocation || debugControlPoints?.length) && (
            <svg
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
