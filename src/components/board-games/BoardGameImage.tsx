import type { SchemaBoardGameOut } from "@/api/board-games/types";
import { cn } from "@/lib/ui/cn";
import { useMutationState } from "@tanstack/react-query";
import { useState } from "react";

const boardGamePlaceholderImage = "/board-games/placeholder.png";

export function BoardGameImage({
  boardGameId,
  hasPhoto,
  className,
}: {
  boardGameId: string;
  hasPhoto: boolean;
  className?: string;
}) {
  const [initialPhotoVersion] = useState(() => Date.now());
  const photoUploads = useMutationState({
    filters: {
      mutationKey: ["post", "/admin/board-games/{id}/photo"],
      status: "success",
      exact: true,
    },
    select: (mutation) => ({
      boardGameId: (mutation.state.data as SchemaBoardGameOut | undefined)?.id,
      submittedAt: mutation.state.submittedAt,
    }),
  });
  const photoVersion = photoUploads.reduce(
    (version, upload) =>
      upload.boardGameId === boardGameId
        ? Math.max(version, upload.submittedAt)
        : version,
    initialPhotoVersion,
  );
  const apiBaseUrl = import.meta.env.VITE_BOARD_GAMES_API_URL.replace(
    /\/$/,
    "",
  );
  const photoPath = `${apiBaseUrl}/board-games/${encodeURIComponent(boardGameId)}/photo`;
  const photoUrl = hasPhoto
    ? `${photoPath}?version=${photoVersion}`
    : boardGamePlaceholderImage;

  return (
    <img
      key={photoUrl}
      src={photoUrl}
      alt=""
      className={cn("bg-base-200", className)}
      onError={(event) => {
        if (
          event.currentTarget.getAttribute("src") === boardGamePlaceholderImage
        )
          return;

        event.currentTarget.src = boardGamePlaceholderImage;
      }}
    />
  );
}
