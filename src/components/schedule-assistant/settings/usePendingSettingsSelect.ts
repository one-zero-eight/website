import { useEffect, useState } from "react";

/**
 * Select a newly created settings item after config refetch.
 * Selecting by index immediately races: invalidate hasn't landed yet, so
 * `isSettingsSelectionValid` clears the selection.
 */
export function usePendingSettingsSelect<T>(
  items: T[] | undefined,
  findIndex: (items: T[], key: string) => number,
  select: (index: number) => void,
) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingKey || !items?.length) return;
    const index = findIndex(items, pendingKey);
    if (index < 0) return;
    select(index);
    setPendingKey(null);
  }, [findIndex, items, pendingKey, select]);

  return setPendingKey;
}
