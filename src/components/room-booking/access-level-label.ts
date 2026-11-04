import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types";
import { t } from "@lingui/core/macro";

export function accessLevelLabel(
  accessLevel?: RoomAccess_levelAnyOf0 | null,
): string | undefined {
  if (!accessLevel) return undefined;

  if (accessLevel === RoomAccess_levelAnyOf0.yellow) {
    return t`Yellow (for students)`;
  }
  if (accessLevel === RoomAccess_levelAnyOf0.red) {
    return t`Red (for employees)`;
  }
  return t`Special rules apply`;
}

export function accessLevelTooltipLabel(
  accessLevel?: RoomAccess_levelAnyOf0 | null,
): string | undefined {
  if (!accessLevel) return undefined;

  if (accessLevel === RoomAccess_levelAnyOf0.yellow) {
    return t`Yellow access level (for students)`;
  }
  if (accessLevel === RoomAccess_levelAnyOf0.red) {
    return t`Red access level (for employees)`;
  }
  return t`Special rules apply`;
}

export function capacityPeopleLabel(capacity: number): string {
  return t`${capacity} people`;
}

export function capacityOptionSuffix(capacity: number): string {
  return t` (capacity: ${capacity} people)`;
}
