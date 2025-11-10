import { SchemaWorkshop } from "@/api/workshops/types";
import { preprocessText } from "@/lib/utils/searchUtils";
import Fuse from "fuse.js";

export const createFuse = (events: SchemaWorkshop[]) => {
  const fuse = new Fuse(events, {
    keys: [
      { name: "english_name", weight: 5 },
      { name: "russian_name", weight: 5 },
      { name: "badges", weight: 4 },
      { name: "english_description", weight: 3 },
      { name: "russian_description", weight: 3 },
      { name: "host", weight: 3 },
      "places",
    ],
    threshold: 0.3,
  });

  return fuse;
};

export const searchFuse = (fuse: Fuse<SchemaWorkshop>, search: string) => {
  if (!search) return [];

  const results = preprocessText(search).flatMap((t) => fuse.search(t));
  return Array.from(new Set(results.map((res) => res.item)));
};
