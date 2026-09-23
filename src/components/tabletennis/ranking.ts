/**
 * Competition ranking by rating: equal ratings share a place and the next
 * place skips the shared ones (1, 2, 2, 4). Highest rating first; ties keep
 * a stable order by name.
 */
export function rankByRating<T extends { rating: number; nickname: string }>(
  players: T[],
): { player: T; place: number }[] {
  const sorted = [...players].sort(
    (a, b) => b.rating - a.rating || a.nickname.localeCompare(b.nickname),
  );
  const ranked: { player: T; place: number }[] = [];
  sorted.forEach((player, index) => {
    const prev = ranked[index - 1];
    const place =
      prev && prev.player.rating === player.rating ? prev.place : index + 1;
    ranked.push({ player, place });
  });
  return ranked;
}

export const PAGE_SIZE = 10;

export function pageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageSlice<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const safe = Math.min(
    Math.max(0, page),
    pageCount(items.length, pageSize) - 1,
  );
  return items.slice(safe * pageSize, safe * pageSize + pageSize);
}
