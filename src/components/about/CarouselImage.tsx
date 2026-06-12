import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useRef } from "react";
import {
  useCarouselImages,
  type AboutCarouselId,
} from "./hooks/useCarouselImages.ts";

const imageClass =
  "h-[200px] w-auto shrink-0 rounded-box object-cover sm:h-[300px]";

const pauseDurationMs = 2500;
const marqueeSpeedPxPerSec = 36;

function getSetWidth(track: HTMLElement, setSize: number) {
  const first = track.children[0] as HTMLElement | undefined;
  const secondSetStart = track.children[setSize] as HTMLElement | undefined;

  if (!first || !secondSetStart) return 0;

  return secondSetStart.offsetLeft - first.offsetLeft;
}

function normalizeOffset(offset: number, setWidth: number) {
  if (setWidth <= 0) return offset;

  if (offset >= setWidth * 2) {
    const jumps = Math.floor((offset - setWidth) / setWidth);
    return offset - setWidth * jumps;
  }

  if (offset < setWidth) {
    const jumps = Math.ceil((setWidth - offset) / setWidth);
    return offset + setWidth * jumps;
  }

  return offset;
}

export function CarouselImage({ id }: { id: AboutCarouselId }) {
  const carouselImages = useCarouselImages(id);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setWidthRef = useRef(0);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimeoutRef = useRef<number>();
  const interactionEndTimeoutRef = useRef<number>();
  const userInteractingRef = useRef(false);
  const isInitializedRef = useRef(false);

  const setSize = carouselImages.length;
  const marqueeImages = useMemo(
    () => [...carouselImages, ...carouselImages, ...carouselImages],
    [id, setSize],
  );
  const showMarquee = setSize > 1;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !showMarquee) return;

    isInitializedRef.current = false;
    setWidthRef.current = 0;

    const applyTransform = () => {
      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    };

    const measure = () => {
      const setWidth = getSetWidth(track, setSize);
      if (setWidth > 0) {
        setWidthRef.current = setWidth;
      }
      return setWidth;
    };

    const initializeOffset = () => {
      const setWidth = measure();
      if (setWidth <= 0) return;

      if (!isInitializedRef.current) {
        offsetRef.current = setWidth;
        isInitializedRef.current = true;
      }

      offsetRef.current = normalizeOffset(offsetRef.current, setWidth);
      applyTransform();
    };

    initializeOffset();
    requestAnimationFrame(initializeOffset);

    let measureTimeout: number;
    const scheduleMeasure = () => {
      clearTimeout(measureTimeout);
      measureTimeout = window.setTimeout(initializeOffset, 50);
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
  }, [showMarquee, setSize, id]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !showMarquee) return;

    let frameId = 0;
    let lastFrameTime = 0;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const touchState = {
      startX: 0,
      startY: 0,
      startOffset: 0,
      axis: null as "x" | "y" | null,
    };

    const applyTransform = () => {
      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    };

    const pauseTemporarily = () => {
      pausedRef.current = true;
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = window.setTimeout(() => {
        pausedRef.current = false;
      }, pauseDurationMs);
    };

    const updateOffset = (delta: number) => {
      const setWidth = setWidthRef.current;
      if (setWidth <= 0) return;

      offsetRef.current = normalizeOffset(offsetRef.current + delta, setWidth);
      applyTransform();
    };

    const tick = (time: number) => {
      if (lastFrameTime === 0) {
        lastFrameTime = time;
      }

      const deltaMs = time - lastFrameTime;
      lastFrameTime = time;

      if (!pausedRef.current && setWidthRef.current > 0) {
        updateOffset((marqueeSpeedPxPerSec * deltaMs) / 1000);
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
      updateOffset(delta);

      clearTimeout(interactionEndTimeoutRef.current);
      interactionEndTimeoutRef.current = window.setTimeout(() => {
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
      touchState.startOffset = offsetRef.current;
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

      const setWidth = setWidthRef.current;
      if (setWidth <= 0) return;

      offsetRef.current = normalizeOffset(
        touchState.startOffset - deltaX,
        setWidth,
      );
      applyTransform();
    };

    const handleTouchEnd = () => {
      if (touchState.axis === "x") {
        clearTimeout(interactionEndTimeoutRef.current);
        interactionEndTimeoutRef.current = window.setTimeout(() => {
          userInteractingRef.current = false;
        }, 120);
      }

      touchState.axis = null;
    };

    frameId = requestAnimationFrame(tick);
    viewport.addEventListener("wheel", handleWheel, { passive: false });
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
      clearTimeout(interactionEndTimeoutRef.current);
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("pointerdown", handleUserInteractionStart);
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [showMarquee, setSize, id]);

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
    <section className="relative -mx-6 mb-4 sm:mx-0">
      <div
        ref={viewportRef}
        className={cn(
          "sm:rounded-box overflow-hidden",
          "max-sm:touch-pan-y",
          "mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={trackRef}
          className="flex w-max gap-3 will-change-transform sm:gap-4"
        >
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
