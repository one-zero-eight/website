import { i18n } from "@lingui/core";

type LocalizedCourse = {
  name: string;
  name_ru?: string | null;
  short_name?: string | null;
  short_name_ru?: string | null;
};

type LocalizedInstructor = {
  id: string;
  name_en?: string | null;
  name_ru?: string | null;
  alias?: string | null;
  email?: string | null;
};

function prefersRussian() {
  return i18n.locale === "ru";
}

function firstFilled(...values: (string | null | undefined)[]) {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

/** Full course name in the active locale; the English name is the canonical fallback. */
export function localizedCourseName(course: LocalizedCourse): string {
  return prefersRussian()
    ? firstFilled(course.name_ru, course.name)
    : firstFilled(course.name);
}

/** Short course name in the active locale, or an empty string when none is configured. */
export function localizedCourseShortName(course: LocalizedCourse): string {
  return prefersRussian()
    ? firstFilled(course.short_name_ru, course.short_name)
    : firstFilled(course.short_name);
}

/** Section name in the active locale; the English name and the code are fallbacks. */
export function localizedSectionName(section: {
  code: string;
  name: string;
  name_ru?: string | null;
}): string {
  return prefersRussian()
    ? firstFilled(section.name_ru, section.name, section.code)
    : firstFilled(section.name, section.code);
}

/** Teaching block name in the active locale; the English name and the id are fallbacks. */
export function localizedBlockName(block: {
  id: string;
  name: string;
  name_ru?: string | null;
}): string {
  return prefersRussian()
    ? firstFilled(block.name_ru, block.name, block.id)
    : firstFilled(block.name, block.id);
}

/** Instructor name in the active locale, then the other locale, alias, email and id. */
export function localizedInstructorName(
  instructor: LocalizedInstructor,
): string {
  const [preferred, other] = prefersRussian()
    ? [instructor.name_ru, instructor.name_en]
    : [instructor.name_en, instructor.name_ru];
  return firstFilled(
    preferred,
    other,
    instructor.alias,
    instructor.email,
    instructor.id,
  );
}

/** Instructor name in the locale that is not active, when it differs from the shown one. */
export function alternateInstructorName(
  instructor: LocalizedInstructor,
): string | null {
  const alternate = firstFilled(
    prefersRussian() ? instructor.name_en : instructor.name_ru,
  );
  if (!alternate || alternate === localizedInstructorName(instructor)) {
    return null;
  }
  return alternate;
}

/** Meeting course title, preferring the short name for compact UI. */
export function meetingCourseShortTitle(meeting: {
  course: string;
  course_name_ru?: string;
  course_short_name?: string;
  course_short_name_ru?: string;
}): string {
  const course = {
    name: meeting.course,
    name_ru: meeting.course_name_ru,
    short_name: meeting.course_short_name,
    short_name_ru: meeting.course_short_name_ru,
  };
  return localizedCourseShortName(course) || localizedCourseName(course);
}

/** Full meeting course title in the active locale. */
export function meetingCourseTitle(meeting: {
  course: string;
  course_name_ru?: string;
}): string {
  return localizedCourseName({
    name: meeting.course,
    name_ru: meeting.course_name_ru,
  });
}
