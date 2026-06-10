import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSectionConfig,
  SchemaSectionProgram,
  SchemaStudentsGroups,
  SchemaTermConfig,
  SchemaTermTimeSlot,
} from "@/api/schedule-assistant/types.ts";

export function getScheduleSections(
  config: SchemaScheduleConfig | null | undefined,
): SchemaSectionConfig[] {
  return config?.term?.sections ?? [];
}

export function formatTermTimeSlots(
  slots: SchemaTermTimeSlot[] | undefined,
): string {
  if (!Array.isArray(slots)) return "";
  return slots
    .map((slot) => {
      const start = String(slot.start_time).slice(0, 5);
      const end = String(slot.end_time).slice(0, 5);
      return `${start}-${end}`;
    })
    .join("\n");
}

function normalizeTimeValue(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export function parseTermTimeSlotsText(text: string): SchemaTermTimeSlot[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [startRaw, endRaw] = line.split("-").map((part) => part.trim());
      return {
        start_time: normalizeTimeValue(startRaw ?? ""),
        end_time: normalizeTimeValue(endRaw ?? startRaw ?? ""),
      };
    })
    .filter((slot) => slot.start_time && slot.end_time);
}

export function getProgramFromTerm(
  term: SchemaTermConfig | null | undefined,
  sectionCode: string,
  programIndex: number,
): SchemaSectionProgram | null {
  const section = getScheduleSections({ term } as SchemaScheduleConfig).find(
    (candidate) => candidate.code === sectionCode,
  );
  if (!section?.programs?.[programIndex]) return null;
  return section.programs[programIndex];
}

export function mutateProgramInTerm(
  term: SchemaTermConfig,
  sectionCode: string,
  programIndex: number,
  mutator: (program: SchemaSectionProgram) => void,
): SchemaTermConfig {
  const nextTerm = structuredClone(term);
  const section = (nextTerm.sections ?? []).find(
    (candidate) => candidate.code === sectionCode,
  );
  if (!section?.programs?.[programIndex]) return term;
  mutator(section.programs[programIndex]);
  return nextTerm;
}

function replaceStudentGroupInCourses(
  courses: SchemaCourseConfig[],
  oldCode: string,
  newCode: string | null,
): SchemaCourseConfig[] {
  return courses.map((course) => ({
    ...course,
    components: course.components.map((component) => ({
      ...component,
      student_groups: component.student_groups
        .map((token) => (token !== oldCode ? token : newCode))
        .filter((token): token is string => token != null),
      sessions: component.sessions?.map((series) => ({
        ...series,
        audience: series.audience
          .map((token) => (token !== oldCode ? token : newCode))
          .filter((token): token is string => token != null),
      })),
    })),
  }));
}

export function renameStudentGroupInTerm(
  term: SchemaTermConfig,
  oldCode: string,
  newCode: string,
): SchemaTermConfig {
  if (oldCode === newCode) return term;
  const nextTerm = structuredClone(term);
  for (const section of nextTerm.sections ?? []) {
    for (const program of section.programs) {
      for (const track of program.tracks) {
        track.groups = track.groups.map((code) =>
          code === oldCode ? newCode : code,
        );
      }
      program.groups = program.groups.map((code) =>
        code === oldCode ? newCode : code,
      );
    }
  }
  return nextTerm;
}

export function deleteStudentGroupFromTerm(
  term: SchemaTermConfig,
  groupCode: string,
): SchemaTermConfig {
  const nextTerm = structuredClone(term);
  for (const section of nextTerm.sections ?? []) {
    for (const program of section.programs) {
      for (const track of program.tracks) {
        track.groups = track.groups.filter((code) => code !== groupCode);
      }
      program.groups = program.groups.filter((code) => code !== groupCode);
    }
  }
  return nextTerm;
}

export function renameStudentGroupInCourses(
  courses: SchemaCourseConfig[],
  oldCode: string,
  newCode: string,
): SchemaCourseConfig[] {
  return replaceStudentGroupInCourses(courses, oldCode, newCode);
}

export function deleteStudentGroupFromCourses(
  courses: SchemaCourseConfig[],
  groupCode: string,
): SchemaCourseConfig[] {
  return replaceStudentGroupInCourses(courses, groupCode, null);
}

export function buildScheduleConfig(
  term: SchemaTermConfig,
  courses: SchemaCourseConfig[],
  rooms: SchemaScheduleConfig["rooms"],
  instructors: SchemaScheduleConfig["instructors"],
  studentsGroups: SchemaStudentsGroups[],
): SchemaScheduleConfig {
  return {
    term,
    courses,
    rooms,
    instructors,
    students_groups: studentsGroups,
  };
}
