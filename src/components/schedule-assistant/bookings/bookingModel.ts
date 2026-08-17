import {
  ConflictMode,
  ReviewKind,
  type SchemaBookingReview,
  type SchemaReviewComponent,
  type SchemaReviewCourse,
  type SchemaReviewProgram,
  type SchemaReviewSlot,
} from "@/api/schedule-assistant/types.ts";

export const EXTRA_NODE_ID = "extra-auto-bookings";

export function programNodeId(programId: string) {
  return `program:${programId}`;
}

export function courseNodeId(programId: string, courseId: string) {
  return `course:${programId}:${courseId}`;
}

export function componentNodeId(
  programId: string,
  courseId: string,
  componentId: string,
) {
  return `component:${programId}:${courseId}:${componentId}`;
}

export function disabledReasonLabel(reason: string | null | undefined) {
  if (reason === "no room") return "нет комнаты";
  if (reason === "online") return "онлайн";
  if (reason === "unknown room") return "неизвестная комната";
  return reason ?? "";
}

export function reviewKindLabel(kind: ReviewKind | null | undefined) {
  if (kind === ReviewKind.ready) return "OK";
  if (kind === ReviewKind.booked) return "Забронировано";
  if (kind === ReviewKind.conflict) return "Конфликт";
  return null;
}

export function isReadySlot(slot: SchemaReviewSlot) {
  return slot.bookable && slot.review_kind === ReviewKind.ready;
}

export function isSplitSelectableSlot(slot: SchemaReviewSlot) {
  return (
    slot.bookable && slot.review_kind === ReviewKind.conflict && slot.can_split
  );
}

export function collectReadySlotIds(review: SchemaBookingReview) {
  const ids: string[] = [];
  for (const program of review.programs) {
    ids.push(...readySlotIdsInProgram(program));
  }
  return ids;
}

export function readySlotIdsInProgram(program: SchemaReviewProgram) {
  const ids: string[] = [];
  for (const course of program.courses) {
    ids.push(...readySlotIdsInCourse(course));
  }
  return ids;
}

export function readySlotIdsInCourse(course: SchemaReviewCourse) {
  const ids: string[] = [];
  for (const component of course.components) {
    ids.push(...readySlotIdsInComponent(component));
  }
  return ids;
}

export function readySlotIdsInComponent(component: SchemaReviewComponent) {
  return component.slots.filter(isReadySlot).map((slot) => slot.slot_id);
}

export function extraIds(review: SchemaBookingReview) {
  return review.extra_auto_bookings.map((item) => item.extra_id);
}

export function slotById(review: SchemaBookingReview, slotId: string) {
  for (const program of review.programs) {
    for (const course of program.courses) {
      for (const component of course.components) {
        for (const slot of component.slots) {
          if (slot.slot_id === slotId) return slot;
        }
      }
    }
  }
  return undefined;
}

export function buildConflictModes(
  review: SchemaBookingReview,
  selectedSlotIds: Set<string>,
) {
  const modes: { [key: string]: ConflictMode } = {};
  for (const slotId of selectedSlotIds) {
    const slot = slotById(review, slotId);
    if (!slot || !isSplitSelectableSlot(slot)) continue;
    modes[slotId] = ConflictMode.split;
  }
  return modes;
}

export function checkState(ids: string[], selected: ReadonlySet<string>) {
  if (ids.length === 0) return "none" as const;
  let count = 0;
  for (const id of ids) {
    if (selected.has(id)) count += 1;
  }
  if (count === 0) return "none" as const;
  if (count === ids.length) return "all" as const;
  return "some" as const;
}

export function countStats(review: SchemaBookingReview) {
  let ready = 0;
  let booked = 0;
  let conflict = 0;
  let disabled = 0;
  for (const program of review.programs) {
    for (const course of program.courses) {
      for (const component of course.components) {
        for (const slot of component.slots) {
          if (!slot.bookable) {
            disabled += 1;
            continue;
          }
          if (slot.review_kind === ReviewKind.booked) booked += 1;
          else if (slot.review_kind === ReviewKind.conflict) conflict += 1;
          else ready += 1;
        }
      }
    }
  }
  return { ready, booked, conflict, disabled };
}

export function formatConflictWhen(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start}–${end}`;
  }
  const date = startDate.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
  });
  const startTime = startDate.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
  const endTime = endDate.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
  return `${date} ${startTime}–${endTime}`;
}

export function pruneSelectedIds(
  selected: ReadonlySet<string>,
  validIds: Iterable<string>,
) {
  const valid = new Set(validIds);
  const next = new Set<string>();
  for (const id of selected) {
    if (valid.has(id)) next.add(id);
  }
  return next;
}
