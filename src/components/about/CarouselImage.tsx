import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import {
  useCarouselImages,
  type AboutCarouselId,
} from "./hooks/useCarouselImages.ts";

export function CarouselImage({ id }: { id: AboutCarouselId }) {
  const carouselImages = useCarouselImages(id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const getScrollStep = (el: HTMLDivElement) => {
    const imageWidth = el.querySelector("img")?.clientWidth ?? 200;
    return imageWidth + 8;
  };

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const handleScrollLeft = () => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTo({
      left: el.scrollLeft - getScrollStep(el),
      behavior: "smooth",
    });
  };

  const handleScrollRight = () => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTo({
      left: el.scrollLeft + getScrollStep(el),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;

      const isAtStart = el.scrollLeft <= 0;
      const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;

      if ((isAtStart && e.deltaY < 0) || (isAtEnd && e.deltaY > 0)) return;

      e.preventDefault();
      el.scrollTo({
        left: el.scrollLeft + e.deltaY,
        behavior: "auto",
      });
    };

    updateScrollState();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [carouselImages.length]);

  return (
    <section className="relative clear-both my-8 w-full lg:my-10">
      <div
        ref={scrollRef}
        className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 flex h-[200px] w-full items-stretch justify-start gap-2 overflow-x-auto overflow-y-hidden lg:h-[300px]"
      >
        {carouselImages.map((image, index) => (
          <img
            key={`${id}-${index}`}
            src={image}
            alt={`Community photo ${index + 1}`}
            className="h-[200px] w-auto min-w-[200px] flex-none rounded object-cover duration-300 lg:h-[300px] lg:min-w-[300px]"
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ))}
      </div>

      <div
        className={cn(
          "absolute inset-y-0 left-0 flex w-28 items-center justify-start transition-opacity duration-300",
          canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <button
          type="button"
          onClick={handleScrollLeft}
          className="relative z-10 flex h-full w-full items-center justify-start pl-1 transition-opacity hover:opacity-80"
        >
          <span className="icon-[mdi--chevron-left] text-4xl text-white/90" />
        </button>
      </div>

      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-28 items-center justify-end transition-opacity duration-300",
          canScrollRight ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/70 via-black/30 to-transparent" />
        <button
          type="button"
          onClick={handleScrollRight}
          className="relative z-10 flex h-full w-full items-center justify-end pr-1 transition-opacity hover:opacity-80"
        >
          <span className="icon-[mdi--chevron-right] text-4xl text-white/90" />
        </button>
      </div>
    </section>
  );
}
