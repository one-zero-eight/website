import type { TimetableViewConfig } from "./timetableViewTypes.ts";
import type { Meeting } from "./timetableViewerModel.ts";

type Instructor = NonNullable<TimetableViewConfig["instructors"]>[number];

function normalizeIdentity(value: string) {
  return value.trim().toLocaleLowerCase();
}

/** Exact IDs take precedence; ambiguous names must never merge people. */
export function resolveTimetableInstructor(
  instructors: Instructor[],
  token: string,
): Instructor | undefined {
  const normalized = normalizeIdentity(token);
  if (!normalized) return undefined;
  const exact = instructors.find(
    (instructor) => normalizeIdentity(instructor.id) === normalized,
  );
  if (exact) return exact;
  const matches = instructors.filter((instructor) =>
    [
      instructor.email,
      instructor.alias,
      instructor.name_en,
      instructor.name_ru,
    ].some((value) => value && normalizeIdentity(value) === normalized),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function instructorAssignedMeetings(
  instructors: Instructor[],
  meetings: Meeting[],
  token: string,
): Meeting[] {
  const instructor = resolveTimetableInstructor(instructors, token);
  return meetings
    .filter((meeting) => {
      if (meeting.cancelled) return false;
      const assignments = Array.isArray(meeting.instructors)
        ? meeting.instructors
        : [meeting.instructors];
      return assignments.some((assignment) => {
        if (!instructor)
          return normalizeIdentity(assignment) === normalizeIdentity(token);
        return (
          resolveTimetableInstructor(instructors, assignment)?.id ===
          instructor.id
        );
      });
    })
    .sort((a, b) =>
      `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`),
    );
}
