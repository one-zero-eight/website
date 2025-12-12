import { SchemaWorkshop } from "@/api/workshops/types";
import { preprocessText } from "@/lib/utils/searchUtils";
import Fuse from "fuse.js";

/**
 * Creates a Fuse.js search instance configured for event search
 * @param events - Array of events to create search index for
 * @returns Configured Fuse.js search instance
 */
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

/**
 * Performs a fuzzy search on events and returns unique results
 * @param fuse - Fuse.js search instance
 * @param search - Search query string
 * @returns Array of unique matching events
 */
export const searchFuse = (fuse: Fuse<SchemaWorkshop>, search: string) => {
  if (!search) return [];

  const results = preprocessText(search).flatMap((t) => fuse.search(t));
  return Array.from(new Set(results.map((res) => res.item)));
};
