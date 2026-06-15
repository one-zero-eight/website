import type { SchemaInstructor } from "@/api/schedule-assistant/types.ts";

export function findInstructorIndex(
  instructors: SchemaInstructor[] | undefined,
  instructorId: string,
): number | null {
  const normalized = instructorId.trim().toLowerCase();
  if (!normalized || !instructors?.length) return null;

  const index = instructors.findIndex(
    (instructor) => instructor.id.trim().toLowerCase() === normalized,
  );
  return index >= 0 ? index : null;
}

export function scrollInstructorIntoCenter(
  container: HTMLElement | null,
  instructorId: string,
): boolean {
  if (!container) return false;

  const element = container.querySelector(
    `[data-instructor-id="${CSS.escape(instructorId)}"]`,
  );
  if (!(element instanceof HTMLElement)) return false;

  element.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: "smooth",
  });
  return true;
}
