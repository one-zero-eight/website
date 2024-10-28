import { mapsTypes } from "@/api/maps";
import { useMapImage } from "@/api/maps/map-image.ts";
import { FloatingOverlay, FloatingPortal } from "@floating-ui/react";
import {
  memo,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export function MapView({
  scene,
  highlightAreas,
}: {
  scene: mapsTypes.SchemaScene;
  highlightAreas: mapsTypes.SchemaSearchResult[];
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const switchFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  // Set fullscreen mode when the fullscreen state changes
  useEffect(() => {
    // requestFullscreen and exitFullscreen are not supported on iPhone Safari
    if (fullscreen) {
      document.body.requestFullscreen?.();
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    }
  }, [fullscreen]);

  // Exit fullscreen mode when the user exits fullscreen mode using the browser
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // Exit fullscreen mode when the user presses the Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <FullscreenMode enable={fullscreen}>
      <div className="relative h-full w-full">
        <MapViewer scene={scene} highlightAreas={highlightAreas} />
        <button
          className="absolute bottom-2 right-2 flex h-fit rounded-xl bg-primary-main/50 px-2 py-2 hover:bg-primary-main/75"
          onClick={() => switchFullscreen()}
        >
          <span className="icon-[material-symbols--fullscreen] text-2xl" />
        </button>
      </div>
    </FullscreenMode>
  );
}

function FullscreenMode({
  children,
  enable,
}: PropsWithChildren<{ enable: boolean }>) {
  if (!enable) return <>{children}</>;

  return (
    <FloatingPortal>
      <FloatingOverlay className="z-10 bg-gray-900/75">
        {children}
      </FloatingOverlay>
    </FloatingPortal>
  );
}

const MapViewer = memo(function MapViewer({
  scene,
  highlightAreas,
}: {
  scene: mapsTypes.SchemaScene;
  highlightAreas: mapsTypes.SchemaSearchResult[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const options = useRef({
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  });

  const { data: mapSvg } = useMapImage(scene.svg_file);

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
    if (!containerRef.current || !imageRef.current) return;
    // Set initial offset to center the image
    const rect = containerRef.current.getBoundingClientRect();
    const imageWidth = imageRef.current.clientWidth;
    const imageHeight = imageRef.current.clientHeight;
    options.current.offsetX = (rect.width - imageWidth) / 2;
    options.current.offsetY = (rect.height - imageHeight) / 2;
    updateImage();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Support panning using mouse
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      container.style.cursor = "grabbing";

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
        container.style.cursor = "grab";
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    // Support zooming using mouse wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Should zoom to the center of the wheel event
      const rect = container.getBoundingClientRect();
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
    };

    // Support panning using touches
    const onTouchStartPanning = (e: TouchEvent) => {
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
    };

    // Support zooming using touches
    const onTouchStartZooming = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length !== 2) return;

      // Should zoom to the center of the two touches
      const rect = container.getBoundingClientRect();
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
    };

    // Add listeners to the container
    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStartPanning, {
      passive: false,
    });
    container.addEventListener("touchstart", onTouchStartZooming, {
      passive: false,
    });
    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStartPanning);
      container.removeEventListener("touchstart", onTouchStartZooming);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full cursor-grab overflow-hidden rounded-xl bg-gray-50"
    >
      <style type="text/css">
        {highlightAreas?.length
          ? `
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        ${highlightAreas.map((s) => `[id="${s.area.svg_polygon_id}"]`).join(",")} {
          fill: violet !important;
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        `
          : ""}
      </style>
      {mapSvg?.data && (
        <div
          ref={imageRef}
          dangerouslySetInnerHTML={{ __html: mapSvg.data }}
          className="block h-full w-full overflow-hidden [&>svg]:h-full [&>svg]:w-full"
        />
      )}
    </div>
  );
});
