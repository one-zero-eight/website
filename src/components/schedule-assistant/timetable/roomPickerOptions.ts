import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import type { Meeting } from "./timetableViewerModel.ts";

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

export function audienceSizeForTokens(
  config: SchemaScheduleConfig,
  audienceTokens: string[] | undefined,
): number | null {
  const tokens = (audienceTokens || [])
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return null;
  const groupIds = expandStudentGroupSelectors(config, tokens);
  if (!groupIds.length) return null;

  const sizeById = new Map(
    (config.students_groups || []).map((group) => [
      String(group.code || "").trim(),
      group.estimated_size,
    ]),
  );

  let total = 0;
  let known = false;
  for (const groupId of groupIds) {
    const size = sizeById.get(groupId);
    if (size == null || !Number.isFinite(size)) continue;
    total += size;
    known = true;
  }
  return known ? total : null;
}

function roomSortKey(
  capacity: number | null | undefined,
  audienceSize: number | null,
): [number, number] {
  if (audienceSize != null && audienceSize > 0) {
    if (capacity != null && capacity >= audienceSize) {
      // Suitable: smallest capacity first.
      return [0, capacity];
    }
    if (capacity != null) {
      // Too small: fewest missing seats first.
      return [1, audienceSize - capacity];
    }
    return [2, Number.POSITIVE_INFINITY];
  }
  if (capacity != null) return [0, capacity];
  return [1, Number.POSITIVE_INFINITY];
}

export function buildRoomPickerOptions({
  config,
  meetings,
  date,
  audienceTokens,
  excludeInstanceId,
  includeRoomIds,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  date: string;
  audienceTokens?: string[];
  excludeInstanceId?: string | null;
  includeRoomIds?: string[];
}): { value: string; label: string; hint?: string }[] {
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

  const audienceSize = audienceSizeForTokens(config, audienceTokens);

  return [...ids]
    .map((roomId) => {
      const room = roomsById.get(roomId);
      const load = countRoomDailyLoad(
        meetings,
        roomId,
        date,
        excludeInstanceId,
      );
      const features = formatRoomFeaturesLabel(room?.features);
      const hint = [
        room?.capacity != null ? `Вместимость ${room.capacity}` : null,
        `в этот день ${load} занятий`,
        features || null,
      ]
        .filter(Boolean)
        .join(", ");
      return {
        value: roomId,
        label: roomId,
        hint: hint || undefined,
        capacity: room?.capacity ?? null,
      };
    })
    .sort((a, b) => {
      const [tierA, capA] = roomSortKey(a.capacity, audienceSize);
      const [tierB, capB] = roomSortKey(b.capacity, audienceSize);
      if (tierA !== tierB) return tierA - tierB;
      if (capA !== capB) return capA - capB;
      return a.value.localeCompare(b.value, "ru");
    })
    .map(({ value, label, hint }) => ({ value, label, hint }));
}
