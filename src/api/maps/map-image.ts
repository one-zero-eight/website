import { customFetch } from "@/api/helpers/custom-fetch.ts";
import { useQuery } from "@tanstack/react-query";

export function getMapImageUrl(svgName: string) {
  return `${import.meta.env.VITE_MAPS_API_URL}/static/${svgName}`;
}

export function useMapImage(svgName: string) {
  const url = getMapImageUrl(svgName);
  return useQuery({
    queryKey: ["maps-image", url],
    queryFn: async ({ signal }) => {
      if (!url) {
        return undefined;
      }

      // Use client to add the auth token
      return customFetch.GET(url, {
        parseAs: "text",
        signal,
      });
    },
    enabled: !!url,
  });
}
