import { customFetch } from "@/api/helpers/custom-fetch.ts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function usePendingLogoUrl(
  clubId: string | null | undefined,
  logoFileId: string | null | undefined,
) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const sourceUrl =
    clubId && logoFileId
      ? `${import.meta.env.VITE_CLUBS_API_URL}/clubs/by-id/${clubId}/pending-logo?v=${encodeURIComponent(logoFileId)}`
      : undefined;

  const {
    data: logoBlob,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["clubs", "pending-logo", clubId, logoFileId],
    queryFn: async ({ signal }) => {
      const response = await customFetch.GET(sourceUrl!, {
        parseAs: "blob",
        signal,
      });
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!sourceUrl,
  });

  useEffect(() => {
    if (!logoBlob) {
      setLogoUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoBlob);
    setLogoUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoBlob]);

  return { logoUrl, isPending, isError };
}
