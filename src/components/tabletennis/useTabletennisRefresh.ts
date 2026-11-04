import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** an open tournament and the tournament list: admins see each other's changes */
export const LIVE_REFETCH_MS = 5000;
/** players top, profile and own matches */
export const BACKGROUND_REFETCH_MS = 15000;

/**
 * Refetches every table tennis query. Any action changes several screens at once
 * (a game changes the bracket, ratings, the top and profiles), so all of them are reloaded.
 */
export function useTabletennisRefresh() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["tabletennis"] }),
    [queryClient],
  );
}
