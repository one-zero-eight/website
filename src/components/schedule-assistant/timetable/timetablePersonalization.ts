import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";
import type { Meeting } from "./timetableViewerModel.ts";

export type PersonalTimetableGroup = {
  groupId: string;
  label: string;
  sectionCode: string;
  programCode: string;
};

/** Follow timetable hierarchy order, not the order returned by personal lookup. */
export function personalTimetableGroups(
  config: TimetableViewConfig,
  groupIds: readonly string[],
): PersonalTimetableGroup[] {
  const own = new Set(groupIds);
  const seen = new Set<string>();
  const labels = new Map(
    (config.students_groups ?? []).map((group) => [
      group.code,
      group.name || group.code,
    ]),
  );
  const groups: PersonalTimetableGroup[] = [];
  for (const section of config.term.sections ?? []) {
    for (const program of section.programs) {
      for (const track of normalizeTracksFromSectionProgram(program)) {
        for (const groupId of track.groups) {
          if (!own.has(groupId) || seen.has(groupId)) continue;
          seen.add(groupId);
          groups.push({
            groupId,
            label: labels.get(groupId) || groupId,
            sectionCode: section.code,
            programCode: program.code,
          });
        }
      }
    }
  }
  return groups;
}

/** Prefer this week, then the nearest available teaching week, skipping cancellations. */
export function nearestPersonalMeeting(
  meetings: readonly Meeting[],
  group: PersonalTimetableGroup,
  today: string,
): Meeting | undefined {
  const todayDate = new Date(`${today}T00:00:00Z`);
  const weekday = (todayDate.getUTCDay() + 6) % 7;
  const weekStart = todayDate.getTime() - weekday * 86_400_000;
  const weekEnd = weekStart + 7 * 86_400_000;
  const distance = (meeting: Meeting) => {
    const time = new Date(`${meeting.date}T00:00:00Z`).getTime();
    if (time >= weekStart && time < weekEnd) return 0;
    return time < weekStart ? weekStart - time : time - weekEnd + 1;
  };
  return meetings
    .filter(
      (meeting) =>
        !meeting.cancelled &&
        meeting.section === group.sectionCode &&
        meeting.groups.includes(group.groupId),
    )
    .sort(
      (a, b) =>
        distance(a) - distance(b) ||
        a.date.localeCompare(b.date) ||
        a.start.localeCompare(b.start),
    )[0];
}

export function shouldAutoNavigatePersonalGroups({
  ready,
  handled,
  userNavigated,
  focusMeetingId,
  groups,
}: {
  ready: boolean;
  handled: boolean;
  userNavigated: boolean;
  focusMeetingId?: string;
  groups: readonly PersonalTimetableGroup[];
}): boolean {
  return (
    ready && !handled && !userNavigated && !focusMeetingId && groups.length > 0
  );
}
