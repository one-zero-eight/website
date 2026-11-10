import { $timer } from "@/api/timer";
import { useMe } from "@/api/accounts/user";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toHackathonTimer } from "../utils";

export function useHackathonTimers() {
  const { me } = useMe();
  const { data, isPending, isError, error, refetch } = $timer.useQuery(
    "get",
    "/timers",
    undefined,
    { enabled: !!me },
  );

  const timers = useMemo(
    () => data?.map((timer) => toHackathonTimer(timer, me!.id)),
    [data, me],
  );

  return { timers, isPending, isError, error, refetch };
}

// Resolves when the timers list is refetched, so a mutation stays pending until then
export function useRefreshTimers() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: $timer.queryOptions("get", "/timers").queryKey,
    });
}
