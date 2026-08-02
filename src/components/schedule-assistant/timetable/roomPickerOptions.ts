import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const HEAVY_DAILY_LOAD = 4;

export function formatRoomFeatureChip(
  key: string,
  value: boolean | string | number,
): string | null {
  if (value === false) return null;
  if (value === true) return key;
  return `${key}=${value}`;
}

export function formatRoomFeaturesLabel(
  features: { [key: string]: boolean | string | number } | undefined,
): string {
  if (!features) return "";
  return Object.entries(features)
    .map(([key, value]) => formatRoomFeatureChip(key, value))
    .filter((part): part is string => !!part)
    .join(", ");
}

export function countRoomDailyLoad(
  meetings: Meeting[],
  roomId: string,
  date: string,
  excludeInstanceId?: string | null,
): number {
  const room = roomId.trim();
  const day = date.trim();
  if (!room || !day) return 0;
  let count = 0;
  for (const meeting of meetings) {
    if (excludeInstanceId && meeting.instance_id === excludeInstanceId) {
      continue;
    }
    if (meeting.cancelled) continue;
    if ((meeting.room || "").trim() !== room) continue;
    if ((meeting.date || "").trim() !== day) continue;
    count += 1;
  }
  return count;
}

export function buildRoomPickerOptions({
  config,
  meetings,
  date,
  excludeInstanceId,
  includeRoomIds,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  date: string;
  excludeInstanceId?: string | null;
  includeRoomIds?: string[];
}): { value: string; label: string }[] {
  const roomsById = new Map(
    (config.rooms || [])
      .map((room) => [String(room.id || "").trim(), room] as const)
      .filter(([id]) => !!id),
  );

  const ids = new Set<string>();
  for (const id of roomsById.keys()) ids.add(id);
  for (const id of includeRoomIds || []) {
    const trimmed = id.trim();
    if (trimmed) ids.add(trimmed);
  }

  const options = [...ids]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((roomId) => {
      const room = roomsById.get(roomId);
      const load = countRoomDailyLoad(
        meetings,
        roomId,
        date,
        excludeInstanceId,
      );
      const features = formatRoomFeaturesLabel(room?.features);
      const heavy = load >= HEAVY_DAILY_LOAD;
      const parts = [
        roomId,
        `сегодня: ${load}`,
        features ? features : null,
        heavy ? "⚠ загружена" : null,
      ].filter(Boolean);
      return { value: roomId, label: parts.join(" · ") };
    });

  return options;
}
