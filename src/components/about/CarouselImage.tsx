import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useRef } from "react";
import {
  useCarouselImages,
  type AboutCarouselId,
} from "./hooks/useCarouselImages.ts";

const imageClass =
  "h-[200px] w-auto shrink-0 rounded-box object-cover sm:h-[300px]";

const pauseDurationMs = 2500;
const marqueeSpeedPx = 0.6;

function getSetWidth(track: HTMLElement, setSize: number) {
  const first = track.children[0] as HTMLElement | undefined;
  const secondSetStart = track.children[setSize] as HTMLElement | undefined;

  if (!first || !secondSetStart) return 0;

  return secondSetStart.offsetLeft - first.offsetLeft;
}

function normalizeScroll(viewport: HTMLDivElement, setWidth: number) {
  if (setWidth <= 0) return;

  if (viewport.scrollLeft >= setWidth * 2) {
    const jumps = Math.floor((viewport.scrollLeft - setWidth) / setWidth);
    viewport.scrollLeft -= setWidth * jumps;
    return;
  }

  if (viewport.scrollLeft < setWidth) {
    const jumps = Math.ceil((setWidth - viewport.scrollLeft) / setWidth);
    viewport.scrollLeft += setWidth * jumps;
  }
}

export function CarouselImage({ id }: { id: AboutCarouselId }) {
  const carouselImages = useCarouselImages(id);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimeoutRef = useRef<number>();
  const scrollEndTimeoutRef = useRef<number>();
  const userInteractingRef = useRef(false);
  const isInitializedRef = useRef(false);

  const setSize = carouselImages.length;
  const marqueeImages = useMemo(
    () => [...carouselImages, ...carouselImages, ...carouselImages],
    [carouselImages],
  );
  const showControls = setSize > 1;

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !showControls) return;

    isInitializedRef.current = false;
    setWidthRef.current = 0;

    const measure = () => {
      const setWidth = getSetWidth(track, setSize);
      if (setWidth > 0) {
        setWidthRef.current = setWidth;
      }
      return setWidth;
    };

    const initializeScroll = () => {
      const setWidth = measure();
      if (setWidth <= 0) return;

      if (!isInitializedRef.current) {
        viewport.scrollLeft = setWidth;
        isInitializedRef.current = true;
      }
    };

    initializeScroll();
    requestAnimationFrame(initializeScroll);

    let measureTimeout: number;
    const scheduleMeasure = () => {
      clearTimeout(measureTimeout);
      measureTimeout = window.setTimeout(initializeScroll, 50);
    };

    const images = track.querySelectorAll("img");
    for (const image of images) {
      if (!image.complete) {
        image.addEventListener("load", scheduleMeasure, { once: true });
      }
    }

    return () => {
      clearTimeout(measureTimeout);
      for (const image of images) {
        image.removeEventListener("load", scheduleMeasure);
      }
    };
  }, [showControls, setSize, id]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !showControls) return;

    let frameId = 0;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const touchState = {
      startX: 0,
      startY: 0,
      startScrollLeft: 0,
      axis: null as "x" | "y" | null,
    };

    const pauseTemporarily = () => {
      pausedRef.current = true;
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = window.setTimeout(() => {
        pausedRef.current = false;
      }, pauseDurationMs);
    };

    const tick = () => {
      if (!pausedRef.current) {
        viewport.scrollLeft += marqueeSpeedPx;
        normalizeScroll(viewport, setWidthRef.current);
      }

      frameId = requestAnimationFrame(tick);
    };

    const handleWheel = (event: WheelEvent) => {
      const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);

      if (isCoarsePointer) {
        if (!isHorizontal) return;
      }

      const delta = isHorizontal ? event.deltaX : event.deltaY;
      if (delta === 0) return;

      event.preventDefault();
      userInteractingRef.current = true;
      pauseTemporarily();
      viewport.scrollLeft += delta;
      normalizeScroll(viewport, setWidthRef.current);

      clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = window.setTimeout(() => {
        normalizeScroll(viewport, setWidthRef.current);
        userInteractingRef.current = false;
      }, 120);
    };

    const handleUserInteractionStart = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      userInteractingRef.current = true;
      pauseTemporarily();
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;

      touchState.startX = touch.clientX;
      touchState.startY = touch.clientY;
      touchState.startScrollLeft = viewport.scrollLeft;
      touchState.axis = null;
      pauseTemporarily();
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchState.startX;
      const deltaY = touch.clientY - touchState.startY;

      if (!touchState.axis) {
        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;

        touchState.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
      }

      if (touchState.axis === "y") return;

      event.preventDefault();
      userInteractingRef.current = true;
      viewport.scrollLeft = touchState.startScrollLeft - deltaX;
    };

    const handleTouchEnd = () => {
      if (touchState.axis === "x") {
        normalizeScroll(viewport, setWidthRef.current);

        clearTimeout(scrollEndTimeoutRef.current);
        scrollEndTimeoutRef.current = window.setTimeout(() => {
          userInteractingRef.current = false;
        }, 120);
      }

      touchState.axis = null;
    };

    const handleScroll = () => {
      if (!userInteractingRef.current) return;

      normalizeScroll(viewport, setWidthRef.current);

      clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = window.setTimeout(() => {
        normalizeScroll(viewport, setWidthRef.current);
        userInteractingRef.current = false;
      }, 120);
    };

    frameId = requestAnimationFrame(tick);
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    viewport.addEventListener("pointerdown", handleUserInteractionStart);
    viewport.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(resumeTimeoutRef.current);
      clearTimeout(scrollEndTimeoutRef.current);
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("scroll", handleScroll);
      viewport.removeEventListener("pointerdown", handleUserInteractionStart);
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [showControls, setSize, id]);

  if (carouselImages.length === 0) {
    return null;
  }

  const handleMouseEnter = () => {
    pausedRef.current = true;
    clearTimeout(resumeTimeoutRef.current);
  };

  const handleMouseLeave = () => {
    pausedRef.current = false;
  };

  return (
    <section className="relative mb-4">
      <div
        ref={viewportRef}
        className={cn(
          "rounded-box overflow-x-auto overscroll-x-contain",
          "max-sm:touch-pan-y sm:touch-pan-x",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div ref={trackRef} className="flex w-max gap-3 sm:gap-4">
          {marqueeImages.map((image, index) => (
            <img
              key={`${id}-${index}`}
              data-carousel-item
              src={image}
              alt={`Community photo ${(index % setSize) + 1}`}
              className={imageClass}
              loading="lazy"
              draggable={false}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
