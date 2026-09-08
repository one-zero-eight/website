import {
  BookingOutcome,
  BookingTaskItemStatus,
  BookingTaskStatus,
  ConflictMode,
  ReviewKind,
  type SchemaBookingTask,
  type SchemaBookingTaskItem,
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
  return (
    slot.bookable &&
    slot.review_kind === ReviewKind.ready &&
    !slot.partially_booked
  );
}

export function isSplitSelectableSlot(slot: SchemaReviewSlot) {
  return (
    slot.bookable &&
    slot.review_kind === ReviewKind.conflict &&
    slot.can_split &&
    !slot.partially_booked
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
  | "pending_approval"
  | "unknown"
  | "declined"
  | "cancelling"
  | "disabled"
  | "online";

export function slotStatus(slot: SchemaReviewSlot): BookingSlotStatus {
  if (!slot.bookable) {
    return slot.disabled_reason === "online" ? "online" : "disabled";
  }
  if (
    slot.partially_booked &&
    (slot.review_kind === ReviewKind.booked ||
      slot.review_kind === ReviewKind.ready)
  )
    return "unknown";
  return slot.review_kind ?? "unknown";
}

export const BOOKING_STATUS_ORDER: BookingSlotStatus[] = [
  "unknown",
  "declined",
  "pending_approval",
  "cancelling",
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
  const counts: Record<BookingSlotStatus, number> = {
    unknown: 0,
    declined: 0,
    pending_approval: 0,
    cancelling: 0,
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
  return review.extra_auto_bookings
    .filter((item) => item.can_cancel)
    .map((item) => item.extra_id);
}

export function findReviewSlotContext(
  review: SchemaBookingReview,
  slotId: string,
) {
  for (const program of review.programs) {
    for (const course of program.courses) {
      for (const component of course.components) {
        for (const slot of component.slots) {
          if (slot.slot_id === slotId) {
            return { program, course, component, slot };
          }
        }
      }
    }
  }
  return undefined;
}

export function slotById(review: SchemaBookingReview, slotId: string) {
  return findReviewSlotContext(review, slotId)?.slot;
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
    const weekday = weekdayKey ?? dayKey(slot.date);
    const range =
      slot.recurrence_start && slot.recurrence_end
        ? ` · ${formatDisplayDate(slot.recurrence_start)}–${formatDisplayDate(slot.recurrence_end)}`
        : " · Границы серии неизвестны";
    return `${everyWeekdayPhraseRu(weekday)} ${time}${room}${range} · Занятий: ${slot.occurrence_dates.length}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
    return `${weekdayLabelRu(dayKey(slot.date))} ${formatDisplayDate(slot.date)} ${time}${room}`;
  }
  return `${time}${room}`.trim();
}

export function groupSelectedSlotsForConfirm(
  review: SchemaBookingReview,
  selectedSlotIds: ReadonlySet<string>,
) {
  const courses: {
    courseId: string;
    course: string;
    groups: {
      groupId: string;
      group: string;
      slots: { id: string; when: string }[];
    }[];
  }[] = [];
  const courseById = new Map<string, (typeof courses)[number]>();
  const groupById = new Map<
    string,
    (typeof courses)[number]["groups"][number]
  >();

  for (const program of review.programs) {
    for (const course of program.courses) {
      for (const component of course.components) {
        for (const slot of component.slots) {
          if (!selectedSlotIds.has(slot.slot_id)) continue;
          let courseNode = courseById.get(course.course_id);
          if (!courseNode) {
            courseNode = {
              courseId: course.course_id,
              course: course.name,
              groups: [],
            };
            courseById.set(course.course_id, courseNode);
            courses.push(courseNode);
          }
          const groupKey = `${course.course_id}:${component.component_id}`;
          let groupNode = groupById.get(groupKey);
          if (!groupNode) {
            groupNode = {
              groupId: component.component_id,
              group: component.label,
              slots: [],
            };
            groupById.set(groupKey, groupNode);
            courseNode.groups.push(groupNode);
          }
          groupNode.slots.push({
            id: slot.slot_id,
            when: formatReviewSlotLabel(slot),
          });
        }
      }
    }
  }
  return courses;
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

export const BOOKING_OUTCOME_LABEL: Record<BookingOutcome, string> = {
  submitted: "Отправлено, ответ ещё неизвестен",
  pending_approval: "Ожидает утверждения",
  accepted: "Подтверждено",
  declined: "Отклонено",
  unknown: "Требуется проверка",
  cancel_requested: "Отменяется",
  cancelled: "Отменено",
};

export function isActiveTask(task: SchemaBookingTask) {
  return (
    task.status === BookingTaskStatus.queued ||
    task.status === BookingTaskStatus.running
  );
}

export function taskItemLabel(item: SchemaBookingTaskItem) {
  if (item.status === BookingTaskItemStatus.pending) return "Ожидает отправки";
  return BOOKING_OUTCOME_LABEL[item.outcome];
}

export function taskNeedsReconciliation(task: SchemaBookingTask) {
  return (
    isActiveTask(task) ||
    task.items.some(
      (item) =>
        item.outcome === BookingOutcome.submitted ||
        item.outcome === BookingOutcome.pending_approval ||
        item.outcome === BookingOutcome.unknown ||
        item.outcome === BookingOutcome.cancel_requested,
    )
  );
}

export function blockedTaskSlotIds(tasks: SchemaBookingTask[]) {
  const blocked = new Set<string>();
  for (const task of tasks) {
    for (const item of task.items) {
      // Keep accepted requests blocked until review agrees too. Only a proven
      // decline or cancellation releases an operation, never a transport error.
      if (
        !isActiveTask(task) &&
        (item.outcome === BookingOutcome.declined ||
          item.outcome === BookingOutcome.cancelled)
      )
        continue;
      for (const id of item.slot_ids) blocked.add(id);
    }
  }
  return blocked;
}

export function mergeBookingTasks(
  current: SchemaBookingTask[],
  incoming: SchemaBookingTask[],
) {
  const byId = new Map(current.map((task) => [task.task_id, task]));
  for (const task of incoming) byId.set(task.task_id, task);
  return [...byId.values()];
}

export function countTaskOutcomes(task: SchemaBookingTask) {
  const counts: Record<BookingOutcome, number> = {
    submitted: 0,
    pending_approval: 0,
    accepted: 0,
    declined: 0,
    unknown: 0,
    cancel_requested: 0,
    cancelled: 0,
  };
  for (const item of task.items) counts[item.outcome] += 1;
  return counts;
}

export function formatTaskOutcomeSummary(task: SchemaBookingTask) {
  const counts = countTaskOutcomes(task);
  return Object.values(BookingOutcome)
    .filter((outcome) => counts[outcome] > 0)
    .map((outcome) => `${BOOKING_OUTCOME_LABEL[outcome]}: ${counts[outcome]}`)
    .join(" · ");
}

export function roomResponseLabel(response: string | null | undefined) {
  if (response === "Accept") return "Принято";
  if (response === "Tentative") return "Ожидает утверждения";
  if (response === "Decline") return "Отклонено";
  if (response === "NoResponseReceived") return "Ответ ещё не получен";
  return "Неизвестен";
}

export function calendarPresenceLabel(presence: string) {
  if (presence === "present") return "Событие найдено";
  if (presence === "absent") return "Событие не найдено";
  return "Не проверено / чтение не завершено";
}

export function formatCheckedAt(checkedAt: string | null | undefined) {
  if (!checkedAt) return "Ещё не проверено";
  return new Date(checkedAt).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
  });
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
