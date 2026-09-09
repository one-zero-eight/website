import type {
  SchemaComponent,
  SchemaCourseConfig,
  SchemaInstructor,
  SchemaRoom,
  SchemaScheduleConfig,
  SchemaStudentsGroups,
} from "@/api/schedule-assistant/types.ts";

/** The viewer only requires display data, never student rosters or preferences. */
export type TimetableViewComponent = Pick<
  SchemaComponent,
  "tag" | "audience" | "sessions"
> &
  Partial<
    Pick<
      SchemaComponent,
      | "per_week"
      | "per_semester"
      | "per_group"
      | "relates_to"
      | "expected_enrollment"
    >
  >;

export type TimetableViewCourse = Pick<
  SchemaCourseConfig,
  | "name"
  | "color"
  | "section_code"
  | "short_name"
  | "name_ru"
  | "short_name_ru"
  | "instructors"
> & { components: TimetableViewComponent[] };

export type TimetableViewInstructor = Omit<
  SchemaInstructor,
  "slot_preferences"
>;

export type TimetableViewConfig = {
  term: Pick<
    SchemaScheduleConfig["term"],
    "name" | "semester" | "days" | "starting_day" | "time_slots" | "sections"
  >;
  courses?: TimetableViewCourse[];
  instructors?: TimetableViewInstructor[];
  rooms?: Pick<SchemaRoom, "id" | "name" | "capacity">[];
  students_groups?: Pick<
    SchemaStudentsGroups,
    "code" | "name" | "estimated_size"
  >[];
};
