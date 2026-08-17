import type { roomBookingTypes } from "@/api/room-booking";

const QUEST_ROOM_NAME = "3.5";
const QUEST_ROOM_TITLE_PATTERN = /(?:^|[^0-9.])3\.5(?:$|[^0-9.])/;
const QUEST_BOOKING_TITLE = "innobootcamp";

export const ROOM_BOOKING_QUEST_START = new Date("2026-08-18T18:00:00+03:00");
export const ROOM_BOOKING_QUEST_END = new Date("2026-08-19T00:00:00+03:00");

const HIDDEN_RESERVATION_RANGES = [
  [ROOM_BOOKING_QUEST_START, new Date("2026-08-18T21:00:00+03:00")],
  [new Date("2026-08-18T21:00:00+03:00"), ROOM_BOOKING_QUEST_END],
] as const;

function normalizeRoomName(value: string) {
  return value.trim().toLowerCase();
}

function getTimestamp(value: Date | string) {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

export function isRoomBookingQuestRoom(
  room: Pick<roomBookingTypes.SchemaRoom, "id" | "short_name" | "title">,
) {
  const id = normalizeRoomName(room.id);
  const shortName = normalizeRoomName(room.short_name);
  const title = normalizeRoomName(room.title);

  return (
    id === QUEST_ROOM_NAME ||
    shortName === QUEST_ROOM_NAME ||
    QUEST_ROOM_TITLE_PATTERN.test(title)
  );
}

export function findRoomBookingQuestRoomId(
  rooms: roomBookingTypes.SchemaRoom[] | undefined,
) {
  return rooms?.find(isRoomBookingQuestRoom)?.id;
}

export function isRoomBookingQuestTitle(title: string) {
  return title.toLowerCase().includes(QUEST_BOOKING_TITLE);
}

export function isHiddenRoomBookingQuestReservation({
  roomId,
  start,
  end,
  questRoomId,
}: {
  roomId: string;
  start: Date | string;
  end: Date | string;
  questRoomId: string | undefined;
}) {
  if (!questRoomId || roomId !== questRoomId) return false;

  const startTimestamp = getTimestamp(start);
  const endTimestamp = getTimestamp(end);

  return HIDDEN_RESERVATION_RANGES.some(
    ([hiddenStart, hiddenEnd]) =>
      startTimestamp === hiddenStart.getTime() &&
      endTimestamp === hiddenEnd.getTime(),
  );
}

export function isRoomBookingQuestSelection({
  room,
  start,
  end,
}: {
  room:
    | Pick<roomBookingTypes.SchemaRoom, "id" | "short_name" | "title">
    | undefined;
  start: Date | undefined;
  end: Date | undefined;
}) {
  if (!room || !start || !end || !isRoomBookingQuestRoom(room)) return false;

  const startTimestamp = start.getTime();
  const endTimestamp = end.getTime();

  return (
    Number.isFinite(startTimestamp) &&
    Number.isFinite(endTimestamp) &&
    startTimestamp >= ROOM_BOOKING_QUEST_START.getTime() &&
    endTimestamp <= ROOM_BOOKING_QUEST_END.getTime() &&
    endTimestamp > startTimestamp
  );
}
