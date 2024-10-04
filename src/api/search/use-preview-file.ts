import { customFetch } from "@/api/helpers/custom-fetch.ts";
import { useQuery } from "@tanstack/react-query";

export function usePreviewFile(url: string | undefined) {
  return useQuery({
    queryKey: ["preview-file", url],
    queryFn: async ({ signal }) => {
      if (!url) {
        return undefined;
      }

      // Use Search client to add the auth token
      return customFetch.GET(url, {
        parseAs: "blob",
        signal,
      });
    },
    enabled: !!url,
    // Do not refetch when the URL does not change
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
