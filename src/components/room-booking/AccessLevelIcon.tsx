import { RoomAccess_level } from "@/api/room-booking/types.ts";
import clsx from "clsx";

export const accessLevelColors: Record<RoomAccess_level, string> = {
  [RoomAccess_level.yellow]: "#FFD700", // Gold
  [RoomAccess_level.red]: "#FF4500", // OrangeRed
  [RoomAccess_level.special]: "#ac72e4", // Violet
};

export function AccessLevelIcon({
  accessLevel,
  className,
}: {
  accessLevel: RoomAccess_level;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "icon-[material-symbols--lock-open-circle-outline]",
        className,
      )}
      style={{ color: accessLevelColors[accessLevel] ?? "inherit" }}
    />
  );
}
