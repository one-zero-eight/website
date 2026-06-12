import {
  useCarouselImages,
  type AboutCarouselId,
} from "./hooks/useCarouselImages.ts";

export function CarouselImage({ id }: { id: AboutCarouselId }) {
  const carouselImages = useCarouselImages(id);

  return (
    <section className="carousel carousel-center rounded-box mb-4 h-[200px] sm:h-[300px]">
      {carouselImages.map((image, index) => (
        <img
          key={`${id}-${index}`}
          src={image}
          alt={`Community photo ${index + 1}`}
          className="carousel-item"
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ))}
    </section>
  );
}
