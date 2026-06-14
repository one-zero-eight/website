import { preprocessText } from "@/lib/utils/searchUtils.ts";
import Fuse from "fuse.js";
import type { Meeting } from "./mock-data.ts";

export function createFuseMeetings(meetings: Meeting[]) {
  return new Fuse(meetings, {
    includeScore: true,
    keys: [
      { name: "title", weight: 5 },
      { name: "room", weight: 4 },
      { name: "description", weight: 3 },
    ],
    threshold: 0.3,
  });
}

export function searchMeetings(
  fuse: Fuse<Meeting>,
  searchQuery: string,
  meetings: Meeting[],
) {
  const trimmedSearch = searchQuery.trim();
  if (!trimmedSearch) return meetings;

  const processedSearchTerms = preprocessText(trimmedSearch);
  const rankedMeetings = new Map<
    Meeting["id"],
    { meeting: Meeting; score: number; firstIndex: number }
  >();

  processedSearchTerms.forEach((term) => {
    fuse.search(term).forEach((result, index) => {
      const score = result.score ?? index;
      const current = rankedMeetings.get(result.item.id);

      if (!current || score < current.score) {
        rankedMeetings.set(result.item.id, {
          meeting: result.item,
          score,
          firstIndex: current?.firstIndex ?? index,
        });
      }
    });
  });

  return Array.from(rankedMeetings.values())
    .sort((a, b) => a.score - b.score || a.firstIndex - b.firstIndex)
    .map(({ meeting }) => meeting);
}
