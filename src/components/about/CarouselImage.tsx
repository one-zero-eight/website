import { useEffect, useRef } from "react";
import { useCarouselImages } from "./hooks/useCarouselImages.ts";

export function CarouselImage() {
  const carouselImages = useCarouselImages();
  const scrollRef = useRef<HTMLDivElement>(null);

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

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <section className="relative my-8 h-[200px] lg:my-10 lg:h-[300px]">
      <div
        ref={scrollRef}
        className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 absolute inset-0 flex h-[200px] items-stretch justify-start gap-2 overflow-x-auto overflow-y-hidden px-2 lg:h-[300px]"
      >
        {carouselImages.map((image, index) => (
          <img
            key={`first-${index}`}
            src={image}
            alt={`Community photo ${index + 1}`}
            className="h-[200px] w-auto min-w-[200px] flex-none rounded object-cover duration-300 lg:h-[300px] lg:min-w-[300px]"
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ))}
      </div>
    </section>
  );
}
