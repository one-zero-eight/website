/** Только схема данных конфигурации расписания (YAML / `ScheduleConfigDraft`). */

export type ScheduleConfigLanguage = "en" | "ru";

export type ScheduleConfigTerm = {
  name: string;
  semester: {
    start_date: string;
    end_date: string;
  };
  days: string[];
  time_slots: string[];
};

export type ScheduleConfigRoom = {
  id: string;
  name: string;
  capacity: number;
};

export type ScheduleConfigInstructor = {
  id: string;
  name: string;
  role: string | null;
};

export type ScheduleConfigProgram = {
  code: string;
  name: string;
  year: number | null;
  language: ScheduleConfigLanguage | null;
  tracks: Array<{
    name: string;
    groups: string[];
  }>;
};

export type ScheduleConfigSectionProgram = {
  code: string;
  name: string;
  kind: "degree_year" | "english_program" | "elective_bucket" | string | null;
  degree: string | null;
  language: ScheduleConfigLanguage | null;
  year: number | null;
  applies_to: string[];
  tracks: Array<{
    code: string;
    name: string;
    kind: "track" | "english_program" | string | null;
    groups: string[];
  }>;
  groups: string[];
};

export type ScheduleConfigSection = {
  code: string;
  name: string;
  kind: "core" | "english" | "electives" | string | null;
  programs: ScheduleConfigSectionProgram[];
};

export type ScheduleConfigStudentsGroup = {
  code: string;
  kind: string;
  name: string | null;
  estimated_size: number | null;
  students: string[];
};

export type ScheduleConfigCourse = {
  name: string;
  course_tags: Array<"core_course" | "elective" | "english" | string>;
  components: Array<{
    tag: "lec" | "tut" | "lab" | "class" | string;
    per_week: number;
    instructor_pool: Array<string | string[]>;
    student_groups: string[];
    expected_enrollment: number | null;
    per_group: boolean;
    relates_to: number | number[] | null;
  }>;
};

export type ScheduleConfigDraft = {
  $schema?: string | null;
  term: ScheduleConfigTerm;
  rooms: ScheduleConfigRoom[];
  instructors: ScheduleConfigInstructor[];
  sections: ScheduleConfigSection[];
  programs: Record<string, ScheduleConfigProgram[]>;
  students_groups: ScheduleConfigStudentsGroup[];
  courses: ScheduleConfigCourse[];
};
