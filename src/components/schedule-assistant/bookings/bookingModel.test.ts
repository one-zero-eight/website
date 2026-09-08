import { describe, expect, it } from "vitest";
import {
  BookingOutcome,
  BookingTaskItemStatus,
  BookingTaskItemRoom_responseAnyOf0,
  BookingTaskItemRoom_presence,
  BookingTaskItemOrganizer_presence,
  BookingTaskKind,
  BookingTaskStatus,
  ReviewKind,
  ReviewSlotRoom_presence,
  type SchemaBookingTask,
  type SchemaBookingTaskItem,
  type SchemaReviewSlot,
  type SchemaBookingReview,
} from "@/api/schedule-assistant/types.ts";
import {
  blockedTaskSlotIds,
  countTaskOutcomes,
  formatReviewSlotLabel,
  mergeBookingTasks,
  taskItemLabel,
  taskNeedsReconciliation,
  collectReadySlotIds,
  countSlotStatuses,
  isReadySlot,
  isSplitSelectableSlot,
  slotStatus,
} from "./bookingModel.ts";

function makeSlot(overrides: Partial<SchemaReviewSlot> = {}): SchemaReviewSlot {
  return {
    slot_id: "slot-1",
    label: "Mathematics",
    date: "2026-09-11",
    start_time: "12:40:00",
    end_time: "14:10:00",
    room: "209",
    bookable: true,
    recurring: false,
    review_kind: ReviewKind.ready,
    partially_booked: false,
    can_split: false,
    conflicts: [],
    disabled_reason: null,
    room_response: "Unknown",
    room_presence: ReviewSlotRoom_presence.unknown,
    checked_at: null,
    message_body: null,
    booking_ids: [],
    recurrence_start: null,
    recurrence_end: null,
    occurrence_dates: [],
    covered_dates: [],
    missing_dates: [],
    can_cancel: false,
    ...overrides,
  };
}

function makeReview(slots: SchemaReviewSlot[]): SchemaBookingReview {
  return {
    programs: [
      {
        program_id: "program",
        name: "Year 1",
        courses: [
          {
            course_id: "math",
            name: "Mathematics",
            components: [{ component_id: "lab", label: "Lab", slots }],
          },
        ],
      },
    ],
    extra_auto_bookings: [],
  };
}

function makeTask(
  overrides: Partial<SchemaBookingTask> = {},
): SchemaBookingTask {
  return {
    task_id: "task-1",
    kind: BookingTaskKind.book,
    status: BookingTaskStatus.done,
    sent: 1,
    done: 1,
    total: 1,
    current: null,
    items: [makeItem()],
    error: null,
    book: null,
    cancel: null,
    ...overrides,
  };
}

function makeItem(
  overrides: Partial<SchemaBookingTaskItem> = {},
): SchemaBookingTaskItem {
  return {
    index: "0",
    title: "Mathematics",
    status: BookingTaskItemStatus.ok,
    outcome: BookingOutcome.pending_approval,
    operation_id: "op-1",
    outlook_booking_id: "outlook-1",
    uid: "uid-1",
    organizer_mailbox: "organizer@example.org",
    room_id: "209",
    room_response: BookingTaskItemRoom_responseAnyOf0.Tentative,
    room_presence: BookingTaskItemRoom_presence.present,
    organizer_presence: BookingTaskItemOrganizer_presence.present,
    checked_at: null,
    message_body: null,
    can_cancel: true,
    slot_ids: ["slot-1"],
    payload: {},
    history: [],
    evidence: [],
    cancellation_scope: null,
    cancellation_status: null,
    occurrence_date: null,
    source_operation_id: null,
    error: null,
    ...overrides,
  };
}

describe("booking task lifecycle", () => {
  it.each([
    BookingOutcome.submitted,
    BookingOutcome.pending_approval,
    BookingOutcome.unknown,
    BookingOutcome.cancel_requested,
    BookingOutcome.accepted,
  ])("blocks resubmission of %s even when transport is finished", (outcome) => {
    expect([
      ...blockedTaskSlotIds([makeTask({ items: [makeItem({ outcome })] })]),
    ]).toEqual(["slot-1"]);
  });
  it("retains reservations on transport errors and active tasks", () => {
    expect([
      ...blockedTaskSlotIds([
        makeTask({
          status: BookingTaskStatus.error,
          items: [
            makeItem({
              status: BookingTaskItemStatus.error,
              outcome: BookingOutcome.unknown,
            }),
          ],
        }),
      ]),
    ]).toEqual(["slot-1"]);
    expect([
      ...blockedTaskSlotIds([
        makeTask({
          status: BookingTaskStatus.running,
          items: [makeItem({ outcome: BookingOutcome.declined })],
        }),
      ]),
    ]).toEqual(["slot-1"]);
  });
  it.each([BookingOutcome.declined, BookingOutcome.cancelled])(
    "releases proven %s operations",
    (outcome) => {
      expect(
        blockedTaskSlotIds([makeTask({ items: [makeItem({ outcome })] })]).size,
      ).toBe(0);
    },
  );
  it("tracks independent submissions without replacing the first task", () => {
    const first = makeTask();
    const second = makeTask({
      task_id: "task-2",
      items: [makeItem({ operation_id: "op-2", slot_ids: ["slot-2"] })],
    });
    const tasks = mergeBookingTasks([first], [second]);
    expect(tasks.map((task) => task.task_id)).toEqual(["task-1", "task-2"]);
    expect([...blockedTaskSlotIds(tasks)]).toEqual(["slot-1", "slot-2"]);
    expect(
      mergeBookingTasks(tasks, [{ ...first, status: BookingTaskStatus.error }]),
    ).toHaveLength(2);
  });
  it("does not call a tentative transport success accepted", () => {
    expect(taskItemLabel(makeItem())).toBe("Ожидает утверждения");
    expect(countTaskOutcomes(makeTask())).toMatchObject({
      pending_approval: 1,
      accepted: 0,
    });
    expect(taskNeedsReconciliation(makeTask())).toBe(true);
    expect(
      taskNeedsReconciliation(
        makeTask({ items: [makeItem({ outcome: BookingOutcome.accepted })] }),
      ),
    ).toBe(false);
  });
});

describe("booking review safety", () => {
  it("does not turn an unchecked slot into availability", () => {
    const slot = makeSlot({ review_kind: null });
    expect(slotStatus(slot)).toBe("unknown");
    expect(isReadySlot(slot)).toBe(false);
    expect(collectReadySlotIds(makeReview([slot]))).toEqual([]);
  });

  it("does not allow resubmitting a partially covered series", () => {
    const slot = makeSlot({ partially_booked: true });
    expect(slotStatus(slot)).toBe("unknown");
    expect(isReadySlot(slot)).toBe(false);
    expect(
      isSplitSelectableSlot({
        ...slot,
        review_kind: ReviewKind.conflict,
        can_split: true,
      }),
    ).toBe(false);
  });

  it("keeps two missing slots visible among four consecutive classes", () => {
    const slots = [
      makeSlot({ slot_id: "first", review_kind: ReviewKind.booked }),
      makeSlot({
        slot_id: "second",
        start_time: "14:20:00",
        end_time: "15:50:00",
        review_kind: null,
      }),
      makeSlot({
        slot_id: "third",
        start_time: "16:00:00",
        end_time: "17:30:00",
        review_kind: null,
      }),
      makeSlot({
        slot_id: "fourth",
        start_time: "17:40:00",
        end_time: "19:10:00",
        review_kind: ReviewKind.booked,
      }),
    ];
    expect(countSlotStatuses(slots)).toMatchObject({
      booked: 2,
      unknown: 2,
      ready: 0,
    });
    expect(collectReadySlotIds(makeReview(slots))).toEqual([]);
  });

  it.each([
    ReviewKind.pending_approval,
    ReviewKind.unknown,
    ReviewKind.declined,
    ReviewKind.cancelling,
  ])("shows %s independently of partial coverage", (review_kind) => {
    const slot = makeSlot({ review_kind, partially_booked: true });
    expect(slotStatus(slot)).toBe(review_kind);
    expect(isReadySlot(slot)).toBe(false);
  });

  it("distinguishes recurring segments by dates and counts", () => {
    const slot = makeSlot({
      recurring: true,
      date: "Friday",
      recurrence_start: "2026-09-11",
      recurrence_end: "2026-09-25",
      occurrence_dates: ["2026-09-11", "2026-09-25"],
    });
    const label = formatReviewSlotLabel(slot);
    expect(label).toContain("11.09");
    expect(label).toContain("25.09");
    expect(label).toContain("Занятий: 2");
    expect(
      formatReviewSlotLabel({ ...slot, recurrence_end: "2026-10-02" }),
    ).not.toEqual(label);
  });

  it("only selects explicitly checked ready slots", () => {
    const slots = [
      makeSlot(),
      makeSlot({ slot_id: "disabled", bookable: false }),
      makeSlot({ slot_id: "unchecked", review_kind: null }),
    ];
    expect(collectReadySlotIds(makeReview(slots))).toEqual(["slot-1"]);
  });
});
