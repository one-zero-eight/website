export const useCarouselImages = () => {
  const baseUrl = `${import.meta.env.VITE_MINIO_URL}/about/images`;
  const imageNames = [
    "108bows.webp",
    "tender-kazan.webp",
    "clubfest.webp",
    "tender-perm.webp",
    "vnedraid.webp",
    "108forest.webp",
    "garage.webp",
    "tenderhack25.webp",
    "hackaton.webp",
    "artem-hellowin.webp",
    "ruslan-gosling.webp",
    "slippers.webp",
    "hellowin2.webp",
  ];

  return imageNames.map((name) => `${baseUrl}/${name}`);
};
