import { clubsTypes } from "@/api/clubs";
import { preprocessText } from "@/lib/utils/searchUtils.ts";
import Fuse from "fuse.js";

export function createFuseInstance(
  clubsList: clubsTypes.SchemaClub[],
  clubLeaders?: { [key: string]: clubsTypes.SchemaLeader | null },
) {
  const clubsWithLeaders = clubsList.map((club) => ({
    ...club,
    leader: club.leader_innohassle_id
      ? (clubLeaders?.[club.leader_innohassle_id] ?? undefined)
      : undefined,
  }));
  return new Fuse(clubsWithLeaders, {
    includeScore: true,
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
  const rankedClubs = new Map<
    clubsTypes.SchemaClub["id"],
    { club: clubsTypes.SchemaClub; score: number; firstIndex: number }
  >();

  processedSearchTerms.forEach((term) => {
    fuse.search(term).forEach((result, index) => {
      const score = result.score ?? index;
      const current = rankedClubs.get(result.item.id);

      if (!current || score < current.score) {
        rankedClubs.set(result.item.id, {
          club: result.item,
          score,
          firstIndex: current?.firstIndex ?? index,
        });
      }
    });
  });

  return Array.from(rankedClubs.values())
    .sort((a, b) => a.score - b.score || a.firstIndex - b.firstIndex)
    .map(({ club }) => club);
}
