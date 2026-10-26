import type { BlockFilterValue } from "@/components/schedule-assistant/BlockFilter.tsx";

export function matchesCourseBlockFilter(
  blocks: readonly string[] | null,
  filter: BlockFilterValue,
): boolean {
  if (filter === "all") return true;
  if (filter === "semester") return blocks === null;
  return blocks === null || blocks.includes(filter);
}
