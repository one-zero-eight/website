import { getImagePath } from "../minio";

export type AboutCarouselId = "development" | "events" | "team";

const carouselImageNames: Record<AboutCarouselId, string[]> = {
  development: [
    "tender-kazan.webp",
    "hackaton.webp",
    "tenderhack25.webp",
    "garage.webp",
    "vnedraid.webp",
  ],
  events: [
    "clubfest.webp",
    "cosmonautics-day.webp",
    "feb-6.webp",
    "hellowin2.webp",
    "slippers.webp",
  ],
  team: [
    "108bows.webp",
    "tender-perm.webp",
    "108forest.webp",
    "karting.webp",
    "spb.webp",
  ],
};

export const useCarouselImages = (id: AboutCarouselId) => {
  return carouselImageNames[id].map((name) => getImagePath(name));
};
