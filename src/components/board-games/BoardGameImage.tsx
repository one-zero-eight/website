import { cn } from "@/lib/ui/cn";
import { useState } from "react";

export function BoardGameImage({
  boardGameId,
  photoFileId,
  className,
}: {
  boardGameId: string;
  photoFileId: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Public route: the API redirects to storage. `v` only busts the browser cache.
  const src =
    photoFileId && !failed
      ? `${import.meta.env.VITE_BOARD_GAMES_API_URL}/board-games/${boardGameId}/photo?v=${encodeURIComponent(photoFileId)}`
      : null;

  if (!src) {
    return (
      <span
        className={cn(
          "bg-base-200 text-base-content/30 flex items-center justify-center",
          className,
        )}
      >
        <span className="icon-[fluent--board-games-20-regular] text-3xl" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={cn("bg-base-200", className)}
      onError={() => setFailed(true)}
    />
  );
}
