import {
  ConflictMode,
  ReviewKind,
  type SchemaBookingReview,
  type SchemaReviewComponent,
  type SchemaReviewCourse,
  type SchemaReviewProgram,
  type SchemaReviewSlot,
} from "@/api/schedule-assistant/types.ts";
import {
  dayKey,
  everyWeekdayPhraseRu,
  formatDisplayDate,
  weekdayLabelRu,
  weeklyPatternDayKey,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";

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

export type BookingSlotStatus =
  | "ready"
  | "booked"
  | "conflict"
  | "disabled"
  | "online";

export function slotStatus(slot: SchemaReviewSlot): BookingSlotStatus {
  if (!slot.bookable) {
    return slot.disabled_reason === "online" ? "online" : "disabled";
  }
  if (slot.review_kind === ReviewKind.conflict) return "conflict";
  if (slot.review_kind === ReviewKind.booked) return "booked";
  return "ready";
}

export const BOOKING_STATUS_ORDER: BookingSlotStatus[] = [
  "conflict",
  "disabled",
  "ready",
  "booked",
  "online",
];

export type BookingReviewItem = {
  componentLabel: string;
  slot: SchemaReviewSlot;
};

export function reviewItemsInComponent(
  component: SchemaReviewComponent,
): BookingReviewItem[] {
  return component.slots.map((slot) => ({
    componentLabel: component.label,
    slot,
  }));
}

export function reviewItemsInCourse(
  course: SchemaReviewCourse,
): BookingReviewItem[] {
  return course.components.flatMap(reviewItemsInComponent);
}

export function countSlotStatuses(slots: SchemaReviewSlot[]) {
  const counts = {
    ready: 0,
    booked: 0,
    conflict: 0,
    disabled: 0,
    online: 0,
  };
  for (const slot of slots) counts[slotStatus(slot)] += 1;
  return counts;
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
  const counts = countSlotStatuses(
    review.programs.flatMap((program) =>
      program.courses.flatMap((course) =>
        course.components.flatMap((component) => component.slots),
      ),
    ),
  );
  return counts;
}

function formatClock(clock: string) {
  return clock.length >= 5 ? clock.slice(0, 5) : clock;
}

export function formatReviewSlotLabel(slot: SchemaReviewSlot) {
  const time = `${formatClock(slot.start_time)}–${formatClock(slot.end_time)}`;
  const room = slot.room ? ` (${slot.room})` : "";
  const weekdayKey = weeklyPatternDayKey(slot.date);
  if (slot.recurring || weekdayKey) {
    return `${everyWeekdayPhraseRu(weekdayKey ?? "")} ${time}${room}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
    return `${weekdayLabelRu(dayKey(slot.date))} ${formatDisplayDate(slot.date)} ${time}${room}`;
  }
  return `${time}${room}`.trim();
}

export function formatConflictsText(review: SchemaBookingReview) {
  const lines: string[] = [];
  let conflictSlots = 0;

  for (const program of review.programs) {
    const programLines: string[] = [];
    for (const course of program.courses) {
      const courseLines: string[] = [];
      for (const component of course.components) {
        const componentLines: string[] = [];
        for (const slot of component.slots) {
          if (
            slot.review_kind !== ReviewKind.conflict ||
            slot.conflicts.length === 0
          ) {
            continue;
          }
          conflictSlots += 1;
          componentLines.push(`      ${formatReviewSlotLabel(slot)}`);
          for (const hit of slot.conflicts) {
            const room = hit.room_id ? ` · ${hit.room_id}` : "";
            const title = hit.title ? ` · ${hit.title}` : "";
            componentLines.push(
              `        ${formatConflictWhen(hit.start, hit.end)}${room}${title}`,
            );
          }
          componentLines.push("");
        }
        if (componentLines.length === 0) continue;
        courseLines.push(`    ${component.label}`, ...componentLines);
      }
      if (courseLines.length === 0) continue;
      programLines.push(`  ${course.name}`, ...courseLines);
    }
    if (programLines.length === 0) continue;
    lines.push(program.name, ...programLines);
  }

  if (conflictSlots === 0) return "Конфликтов нет.";
  return [`Конфликтующих слотов: ${conflictSlots}`, "", ...lines]
    .join("\n")
    .trimEnd();
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
