import type { Meeting } from "./timetableViewerModel.ts";

export type MeetingPickerIndex = {
  byRoomDate: Map<string, Meeting[]>;
  byInstructorDate: Map<string, Meeting[]>;
};

function push(map: Map<string, Meeting[]>, key: string, meeting: Meeting) {
  const list = map.get(key);
  if (list) list.push(meeting);
  else map.set(key, [meeting]);
}

function instructorIdsOf(meeting: Meeting): string[] {
  const raw = meeting.instructors;
  if (typeof raw === "string") {
    const id = raw.trim();
    return id ? [id] : [];
  }
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const id = String(item || "").trim();
    if (id) out.push(id);
  }
  return out;
}

export function meetingRoomDateKey(roomId: string, date: string): string {
  return `${roomId}\0${date}`;
}

export function meetingInstructorDateKey(
  instructorId: string,
  date: string,
): string {
  return `${instructorId}\0${date}`;
}

/** Index meetings for fast room/instructor conflict lookups. */
export function buildMeetingPickerIndex(
  meetings: Meeting[],
): MeetingPickerIndex {
  const byRoomDate = new Map<string, Meeting[]>();
  const byInstructorDate = new Map<string, Meeting[]>();

  for (const meeting of meetings) {
    if (meeting.cancelled) continue;
    const day = (meeting.date || "").trim();
    if (!day) continue;

    const room = (meeting.room || "").trim();
    if (room) push(byRoomDate, meetingRoomDateKey(room, day), meeting);

    for (const instructorId of instructorIdsOf(meeting)) {
      push(
        byInstructorDate,
        meetingInstructorDateKey(instructorId, day),
        meeting,
      );
    }
  }

  return { byRoomDate, byInstructorDate };
}
