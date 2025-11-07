import { clubsTypes } from "@/api/clubs";
import { preprocessText } from "@/lib/utils/searchUtils.ts";
import Fuse from "fuse.js";

export function createFuseInstance(
  clubsList: clubsTypes.SchemaClub[],
  clubLeaders: { [key: string]: clubsTypes.SchemaLeader },
) {
  const clubsWithLeaders = clubsList.map((club) => ({
    ...club,
    leader: club.leader_innohassle_id
      ? clubLeaders[club.leader_innohassle_id]
      : undefined,
  }));
  return new Fuse(clubsWithLeaders, {
    keys: [
      { name: "title", weight: 5 },
      { name: "slug", weight: 4 },
      { name: "short_description", weight: 3 },
      { name: "leader.name", weight: 2 },
      { name: "leader.telegram_alias", weight: 2 },
      { name: "type", weight: 1 },
    ],
    threshold: 0.3,
  });
}

export function searchClubs(
  fuse: Fuse<clubsTypes.SchemaClub>,
  searchQuery: string,
) {
  if (!searchQuery) return [];

  const processedSearchTerms = preprocessText(searchQuery);
  // Search using all variants
  const result = processedSearchTerms.flatMap((term) => fuse.search(term));
  // Remove duplicates and return matches
  return Array.from(new Set(result.map((res) => res.item)));
}
