export const useCarouselImages = () => {
  const baseUrl = `${import.meta.env.VITE_MINIO_URL}/about/images`;
  const imageNames = [
    "108bows.webp",
    "tenderhack25.webp",
    "clubfest.webp",
    "vnedraid.webp",
    "108forest.webp",
    "garage.webp",
    "hackaton.webp",
    "artem-hellowin.webp",
    "ruslan-gosling.webp",
    "slippers.webp",
    "hellowin2.webp",
  ];

  return imageNames.map((name) => `${baseUrl}/${name}`);
};
