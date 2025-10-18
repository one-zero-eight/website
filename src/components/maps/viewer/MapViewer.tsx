import { mapsTypes } from "@/api/maps";
import { useMapImage } from "@/api/maps/map-image.ts";
import { DetailsPopup } from "@/components/maps/viewer/DetailsPopup.tsx";
import { memo, useEffect, useRef, useState } from "react";
import { useEventListener } from "usehooks-ts";

export const MapViewer = memo(function MapViewer({
  scene,
  highlightAreas,
  disablePopup = false,
}: {
  scene: mapsTypes.SchemaScene;
  highlightAreas: mapsTypes.SchemaArea[];
  disablePopup?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const options = useRef({
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  });

  const { data: mapSvg } = useMapImage(scene.svg_file);
  const [popupArea, setPopupArea] = useState<mapsTypes.SchemaArea>();
  const [popupIsOpen, setPopupIsOpen] = useState(false);
  const [popupElement, setPopupElement] = useState<Element | null>(null);

  const updateImage = () => {
    if (!containerRef.current || !imageRef.current) return;
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

    imageRef.current.style.transformOrigin = "left top";
    imageRef.current.style.transform = `translate(${options.current.offsetX}px, ${options.current.offsetY}px) scale(${options.current.zoom})`;
  };

  useEffect(() => {
    // Update on every rerender to match the latest state
    updateImage();
  });

  useEffect(() => {
    if (!containerRef.current || !imageRef.current) return;
    if (options.current.offsetX !== 0 || options.current.offsetY !== 0) return;
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
      e.preventDefault();
      if (!containerRef.current) return;

      containerRef.current.style.cursor = "grabbing";

      const startX = e.clientX;
      const startY = e.clientY;
      const startOffsetX = options.current.offsetX;
      const startOffsetY = options.current.offsetY;
      const onMouseMove = (e: MouseEvent) => {
        options.current.offsetX = startOffsetX + e.clientX - startX;
        options.current.offsetY = startOffsetY + e.clientY - startY;
        updateImage();
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
    containerRef,
  );

  // Support zooming using mouse wheel
  useEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (!containerRef.current) return;

      // Should zoom to the center of the wheel event
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const oldZoom = options.current.zoom;
      const newZoom = Math.min(
        Math.max(oldZoom * Math.pow(1.001, -e.deltaY), 0.5),
        6,
      );
      const zoomRatio = newZoom / oldZoom;
      options.current.zoom = newZoom;
      options.current.offsetX =
        mouseX - (mouseX - options.current.offsetX) * zoomRatio;
      options.current.offsetY =
        mouseY - (mouseY - options.current.offsetY) * zoomRatio;
      updateImage();
    },
    containerRef,
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
        options.current.offsetX = startOffsetX + e.touches[0].clientX - startX;
        options.current.offsetY = startOffsetY + e.touches[0].clientY - startY;
        updateImage();
      };
      const onTouchEnd = () => {
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onTouchEnd);
    },
    containerRef,
    { passive: false }, // Prevent page scrolling
  );

  // Support zooming using touches
  useEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (!containerRef.current) return;
      if (e.touches.length !== 2) return;

      // Should zoom to the center of the two touches
      const rect = containerRef.current.getBoundingClientRect();
      const startOffsetX = options.current.offsetX;
      const startOffsetY = options.current.offsetY;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
      const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
      const oldZoom = options.current.zoom;
      const oldDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY,
      );
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length !== 2) return;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const newDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );
        const newZoom = Math.min(
          Math.max(oldZoom * (newDistance / oldDistance), 0.5),
          6,
        );
        const zoomRatio = newZoom / oldZoom;
        options.current.zoom = newZoom;
        options.current.offsetX =
          (touch1.clientX + touch2.clientX) / 2 -
          rect.left -
          (centerX - startOffsetX) * zoomRatio;
        options.current.offsetY =
          (touch1.clientY + touch2.clientY) / 2 -
          rect.top -
          (centerY - startOffsetY) * zoomRatio;
        updateImage();
      };
      const onTouchEnd = () => {
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onTouchEnd);
    },
    containerRef,
    { passive: false }, // Prevent page scrolling
  );

  // Detect area clicks using mouse
  useEventListener(
    "mousedown",
    (e) => {
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
          const area = scene.areas.find((a) => a.svg_polygon_id === el?.id);
          if (!el || !area) return;

          // Show popup
          setPopupElement(el);
          setPopupArea(area);
          setPopupIsOpen(true);
        }
      };
      window.addEventListener("mouseup", onMouseUp);
    },
    containerRef,
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
          Math.abs(e.touches[0].clientX - e2.changedTouches[0].clientX) <= 15 &&
          Math.abs(e.touches[0].clientY - e2.changedTouches[0].clientY) <= 15
        ) {
          // Find the nearest element with id
          const el = (e.target as HTMLElement | null)?.closest("[id]");
          // Find matching area
          const area = scene.areas.find((a) => a.svg_polygon_id === el?.id);
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
    containerRef,
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
      ...areasRect.map((r) => (r.left - imageRect.left) / options.current.zoom),
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
    const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.5), 4);

    const areaCenterX = minX + (maxX - minX) / 2;
    const areaCenterY = minY + (maxY - minY) / 2;

    const offsetX = rect.width / 2 - areaCenterX * zoom;
    const offsetY = rect.height / 2 - areaCenterY * zoom;

    options.current.offsetX = offsetX;
    options.current.offsetY = offsetY;
    options.current.zoom = zoom;
    updateImage();

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
  }, [scene, highlightAreas, mapSvg?.data]);

  return (
    <div
      ref={containerRef}
      className="flex h-full max-h-full w-full cursor-grab overflow-hidden bg-gray-50/50 dark:bg-gray-50/90"
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
        ${scene.areas.map((a) => `[id="${a.svg_polygon_id}"]`).join(",")} {
          cursor: ${disablePopup ? "default" : "pointer"};
        }
        ${
          !disablePopup
            ? scene.areas
                .map((a) => `[id="${a.svg_polygon_id}"]:hover`)
                .join(",") +
              ` {
          opacity: 0.2 !important;
          fill: violet !important;
        }`
            : ""
        }
        `}
      </style>
      {mapSvg?.data && (
        <div
          ref={imageRef}
          dangerouslySetInnerHTML={{ __html: mapSvg.data }}
          className="h-full w-full [&>svg]:!h-full [&>svg]:!w-full"
        />
      )}
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
});
