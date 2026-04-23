import { RoomAccess_level } from "@/api/room-booking/types.ts";
import { cn } from "@/lib/ui/cn";
import { memo } from "react";

export const accessLevelColors: Record<RoomAccess_level, string> = {
  [RoomAccess_level.yellow]: "#FFD700", // Gold
  [RoomAccess_level.red]: "#FF4500", // OrangeRed
  [RoomAccess_level.special]: "#ac72e4", // Violet
};

export const AccessLevelIcon = memo(function AccessLevelIcon({
  accessLevel,
  className,
}: {
  accessLevel: RoomAccess_level;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "icon-[material-symbols--lock-open-circle-outline]",
        className,
      )}
      style={{ color: accessLevelColors[accessLevel] ?? "inherit" }}
    />
  );
});
