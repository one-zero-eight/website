import { msg } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";

// The cAtIx API answers its errors with a short code in `detail` ("changed", "already_admin"...)
export function apiDetail(error: unknown): string | undefined {
  const detail = (error as { body?: { detail?: unknown } } | null)?.body
    ?.detail;
  return typeof detail === "string" ? detail : undefined;
}

export const MODE_LABELS = {
  store: msg`Store`,
  search: msg`Search only`,
  off: msg`Off`,
};

export type Mode = keyof typeof MODE_LABELS;

// The pattern of a study group code (the API: groups.CODE_RE)
export const GROUP_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

// After any admin change every admin list and card is stale: reload them all
export function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey.some(
          (part) => typeof part === "string" && part.startsWith("/admin"),
        ),
    });
}
