import { boardGamesFetch } from "@/api/board-games";
import { cn } from "@/lib/ui/cn";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const boardGamePlaceholderImage = "/board-games/placeholder.png";

export function BoardGameImage({
  boardGameId,
  photoFileId,
  className,
}: {
  boardGameId: string;
  photoFileId: string | null;
  className?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoQuery = useQuery({
    queryKey: ["board-game-photo", boardGameId, photoFileId],
    enabled: Boolean(photoFileId),
    queryFn: async () => {
      const { data, error } = await boardGamesFetch.GET(
        "/board-games/{id}/photo",
        {
          params: { path: { id: boardGameId } },
          parseAs: "blob",
        },
      );

      if (error) throw error;
      return data as Blob;
    },
  });

  useEffect(() => {
    if (!photoQuery.data) {
      setPhotoUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoQuery.data);
    setPhotoUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoQuery.data]);

  return (
    <img
      src={photoUrl ?? boardGamePlaceholderImage}
      alt=""
      className={cn("bg-base-200", className)}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = boardGamePlaceholderImage;
      }}
    />
  );
}
