import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { cn } from "@/lib/ui/cn";
import { memo } from "react";

export const accessLevelColors: Record<RoomAccess_levelAnyOf0, string> = {
  [RoomAccess_levelAnyOf0.yellow]: "#FFD700", // Gold
  [RoomAccess_levelAnyOf0.red]: "#FF4500", // OrangeRed
  [RoomAccess_levelAnyOf0.special]: "#ac72e4", // Violet
};

export const AccessLevelIcon = memo(function AccessLevelIcon({
  accessLevel,
  className,
}: {
  accessLevel: RoomAccess_levelAnyOf0;
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
