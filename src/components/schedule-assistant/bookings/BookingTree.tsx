import { ReviewKind } from "@/api/schedule-assistant/types.ts";
import type {
  SchemaBookingReview,
  SchemaExtraAutoBooking,
  SchemaReviewComponent,
  SchemaReviewCourse,
  SchemaReviewProgram,
  SchemaReviewSlot,
} from "@/api/schedule-assistant/types.ts";
import {
  checkState,
  componentNodeId,
  courseNodeId,
  disabledReasonLabel,
  EXTRA_NODE_ID,
  formatConflictWhen,
  isReadySlot,
  isSplitSelectableSlot,
  programNodeId,
  readySlotIdsInComponent,
  readySlotIdsInCourse,
  readySlotIdsInProgram,
  reviewKindLabel,
} from "./bookingModel.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useRef } from "react";

export function BookingTree({
  review,
  expandedIds,
  selectedSlotIds,
  selectedExtraIds,
  expandedConflictIds,
  disabled,
  onToggleExpanded,
  onToggleSlots,
  onToggleExtras,
  onToggleConflictDetails,
}: {
  review: SchemaBookingReview;
  expandedIds: ReadonlySet<string>;
  selectedSlotIds: ReadonlySet<string>;
  selectedExtraIds: ReadonlySet<string>;
  expandedConflictIds: ReadonlySet<string>;
  disabled: boolean;
  onToggleExpanded: (id: string) => void;
  onToggleSlots: (ids: string[], selected: boolean) => void;
  onToggleExtras: (ids: string[], selected: boolean) => void;
  onToggleConflictDetails: (slotId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {review.programs.map((program) => (
        <ProgramBranch
          key={program.program_id}
          program={program}
          expandedIds={expandedIds}
          selectedSlotIds={selectedSlotIds}
          expandedConflictIds={expandedConflictIds}
          disabled={disabled}
          onToggleExpanded={onToggleExpanded}
          onToggleSlots={onToggleSlots}
          onToggleConflictDetails={onToggleConflictDetails}
        />
      ))}
      {review.extra_auto_bookings.length > 0 ? (
        <ExtraBranch
          extras={review.extra_auto_bookings}
          expanded={expandedIds.has(EXTRA_NODE_ID)}
          selectedExtraIds={selectedExtraIds}
          disabled={disabled}
          onToggleExpanded={() => onToggleExpanded(EXTRA_NODE_ID)}
          onToggleExtras={onToggleExtras}
        />
      ) : null}
    </div>
  );
}

function ProgramBranch({
  program,
  expandedIds,
  selectedSlotIds,
  expandedConflictIds,
  disabled,
  onToggleExpanded,
  onToggleSlots,
  onToggleConflictDetails,
}: {
  program: SchemaReviewProgram;
  expandedIds: ReadonlySet<string>;
  selectedSlotIds: ReadonlySet<string>;
  expandedConflictIds: ReadonlySet<string>;
  disabled: boolean;
  onToggleExpanded: (id: string) => void;
  onToggleSlots: (ids: string[], selected: boolean) => void;
  onToggleConflictDetails: (slotId: string) => void;
}) {
  const nodeId = programNodeId(program.program_id);
  const expanded = expandedIds.has(nodeId);
  const ids = readySlotIdsInProgram(program);
  const state = checkState(ids, selectedSlotIds);

  return (
    <div className="rounded-box border-base-300 bg-base-100 border">
      <TreeRow
        depth={0}
        expanded={expanded}
        hasChildren={program.courses.length > 0}
        checkState={state}
        checkDisabled={disabled || ids.length === 0}
        label={program.name}
        onToggleExpanded={() => onToggleExpanded(nodeId)}
        onToggleCheck={() => onToggleSlots(ids, state !== "all")}
      />
      {expanded
        ? program.courses.map((course) => (
            <CourseBranch
              key={course.course_id}
              programId={program.program_id}
              course={course}
              expandedIds={expandedIds}
              selectedSlotIds={selectedSlotIds}
              expandedConflictIds={expandedConflictIds}
              disabled={disabled}
              onToggleExpanded={onToggleExpanded}
              onToggleSlots={onToggleSlots}
              onToggleConflictDetails={onToggleConflictDetails}
            />
          ))
        : null}
    </div>
  );
}

function CourseBranch({
  programId,
  course,
  expandedIds,
  selectedSlotIds,
  expandedConflictIds,
  disabled,
  onToggleExpanded,
  onToggleSlots,
  onToggleConflictDetails,
}: {
  programId: string;
  course: SchemaReviewCourse;
  expandedIds: ReadonlySet<string>;
  selectedSlotIds: ReadonlySet<string>;
  expandedConflictIds: ReadonlySet<string>;
  disabled: boolean;
  onToggleExpanded: (id: string) => void;
  onToggleSlots: (ids: string[], selected: boolean) => void;
  onToggleConflictDetails: (slotId: string) => void;
}) {
  const nodeId = courseNodeId(programId, course.course_id);
  const expanded = expandedIds.has(nodeId);
  const ids = readySlotIdsInCourse(course);
  const state = checkState(ids, selectedSlotIds);

  return (
    <div>
      <TreeRow
        depth={1}
        expanded={expanded}
        hasChildren={course.components.length > 0}
        checkState={state}
        checkDisabled={disabled || ids.length === 0}
        label={course.name}
        onToggleExpanded={() => onToggleExpanded(nodeId)}
        onToggleCheck={() => onToggleSlots(ids, state !== "all")}
      />
      {expanded
        ? course.components.map((component) => (
            <ComponentBranch
              key={component.component_id}
              programId={programId}
              courseId={course.course_id}
              component={component}
              expandedIds={expandedIds}
              selectedSlotIds={selectedSlotIds}
              expandedConflictIds={expandedConflictIds}
              disabled={disabled}
              onToggleExpanded={onToggleExpanded}
              onToggleSlots={onToggleSlots}
              onToggleConflictDetails={onToggleConflictDetails}
            />
          ))
        : null}
    </div>
  );
}

function ComponentBranch({
  programId,
  courseId,
  component,
  expandedIds,
  selectedSlotIds,
  expandedConflictIds,
  disabled,
  onToggleExpanded,
  onToggleSlots,
  onToggleConflictDetails,
}: {
  programId: string;
  courseId: string;
  component: SchemaReviewComponent;
  expandedIds: ReadonlySet<string>;
  selectedSlotIds: ReadonlySet<string>;
  expandedConflictIds: ReadonlySet<string>;
  disabled: boolean;
  onToggleExpanded: (id: string) => void;
  onToggleSlots: (ids: string[], selected: boolean) => void;
  onToggleConflictDetails: (slotId: string) => void;
}) {
  const nodeId = componentNodeId(programId, courseId, component.component_id);
  const expanded = expandedIds.has(nodeId);
  const ids = readySlotIdsInComponent(component);
  const state = checkState(ids, selectedSlotIds);

  return (
    <div>
      <TreeRow
        depth={2}
        expanded={expanded}
        hasChildren={component.slots.length > 0}
        checkState={state}
        checkDisabled={disabled || ids.length === 0}
        label={component.label}
        onToggleExpanded={() => onToggleExpanded(nodeId)}
        onToggleCheck={() => onToggleSlots(ids, state !== "all")}
      />
      {expanded
        ? component.slots.map((slot) => (
            <SlotRow
              key={slot.slot_id}
              slot={slot}
              selected={selectedSlotIds.has(slot.slot_id)}
              detailsOpen={expandedConflictIds.has(slot.slot_id)}
              disabled={disabled}
              onToggle={() =>
                onToggleSlots(
                  [slot.slot_id],
                  !selectedSlotIds.has(slot.slot_id),
                )
              }
              onSplit={() => onToggleSlots([slot.slot_id], true)}
              onSkip={() => onToggleSlots([slot.slot_id], false)}
              onToggleDetails={() => onToggleConflictDetails(slot.slot_id)}
            />
          ))
        : null}
    </div>
  );
}

function SlotRow({
  slot,
  selected,
  detailsOpen,
  disabled,
  onToggle,
  onSplit,
  onSkip,
  onToggleDetails,
}: {
  slot: SchemaReviewSlot;
  selected: boolean;
  detailsOpen: boolean;
  disabled: boolean;
  onToggle: () => void;
  onSplit: () => void;
  onSkip: () => void;
  onToggleDetails: () => void;
}) {
  const ready = isReadySlot(slot);
  const splitSelectable = isSplitSelectableSlot(slot);
  const kindLabel = reviewKindLabel(slot.review_kind);
  const reason = disabledReasonLabel(slot.disabled_reason);

  return (
    <div className="border-base-200 border-t">
      <div className="flex items-start gap-2 py-1.5 pr-2 pl-14">
        {ready ? (
          <input
            type="checkbox"
            className="checkbox checkbox-xs mt-1 shrink-0"
            checked={selected}
            disabled={disabled}
            onChange={onToggle}
          />
        ) : (
          <span className="mt-1 w-3.5 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="min-w-0 text-sm wrap-break-word">
              {slot.label}
            </span>
            {kindLabel && slot.bookable ? (
              <span
                className={cn(
                  "badge badge-sm shrink-0",
                  slot.review_kind === ReviewKind.ready && "badge-success",
                  slot.review_kind === ReviewKind.booked && "badge-ghost",
                  slot.review_kind === ReviewKind.conflict && "badge-warning",
                )}
              >
                {kindLabel}
              </span>
            ) : null}
            {!slot.bookable && reason ? (
              <span className="badge badge-ghost badge-sm shrink-0">
                {reason}
              </span>
            ) : null}
          </div>
          {slot.review_kind === ReviewKind.conflict ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  "btn btn-xs",
                  !selected ? "btn-neutral" : "btn-ghost",
                )}
                disabled={disabled}
                onClick={onSkip}
              >
                Пропустить
              </button>
              {splitSelectable ? (
                <button
                  type="button"
                  className={cn(
                    "btn btn-xs",
                    selected ? "btn-warning" : "btn-ghost",
                  )}
                  disabled={disabled}
                  onClick={onSplit}
                >
                  Разбить
                </button>
              ) : null}
              {slot.conflicts.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1"
                  onClick={onToggleDetails}
                >
                  {detailsOpen ? "Скрыть пересечения" : "Пересечения"}
                  <span className="badge badge-xs">
                    {slot.conflicts.length}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {detailsOpen &&
      slot.review_kind === ReviewKind.conflict &&
      slot.conflicts.length > 0 ? (
        <ul className="text-base-content/70 pb-2 pl-16 text-xs">
          {slot.conflicts.map((hit, index) => (
            <li key={`${hit.start}-${hit.room_id}-${index}`} className="py-0.5">
              {formatConflictWhen(hit.start, hit.end)}
              {hit.room_id ? ` · ${hit.room_id}` : ""}
              {hit.title ? ` · ${hit.title}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ExtraBranch({
  extras,
  expanded,
  selectedExtraIds,
  disabled,
  onToggleExpanded,
  onToggleExtras,
}: {
  extras: SchemaExtraAutoBooking[];
  expanded: boolean;
  selectedExtraIds: ReadonlySet<string>;
  disabled: boolean;
  onToggleExpanded: () => void;
  onToggleExtras: (ids: string[], selected: boolean) => void;
}) {
  const ids = extras.map((item) => item.extra_id);
  const state = checkState(ids, selectedExtraIds);

  return (
    <div className="rounded-box border-warning/40 bg-base-100 border">
      <TreeRow
        depth={0}
        expanded={expanded}
        hasChildren={extras.length > 0}
        checkState={state}
        checkDisabled={disabled || ids.length === 0}
        label={`Лишние авто-бронирования (${extras.length})`}
        onToggleExpanded={onToggleExpanded}
        onToggleCheck={() => onToggleExtras(ids, state !== "all")}
      />
      {expanded
        ? extras.map((item) => (
            <ExtraRow
              key={item.extra_id}
              item={item}
              selected={selectedExtraIds.has(item.extra_id)}
              disabled={disabled}
              onToggle={() =>
                onToggleExtras(
                  [item.extra_id],
                  !selectedExtraIds.has(item.extra_id),
                )
              }
            />
          ))
        : null}
    </div>
  );
}

function ExtraRow({
  item,
  selected,
  disabled,
  onToggle,
}: {
  item: SchemaExtraAutoBooking;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="border-base-200 flex cursor-pointer items-start gap-2 border-t py-1.5 pr-2 pl-9">
      <input
        type="checkbox"
        className="checkbox checkbox-xs mt-1 shrink-0"
        checked={selected}
        disabled={disabled}
        onChange={onToggle}
      />
      <span className="flex min-w-0 flex-col text-sm wrap-break-word">
        {item.label}
        <span className="text-base-content/60 text-xs">
          {formatConflictWhen(item.start, item.end)}
          {item.room_id ? ` · ${item.room_id}` : ""}
        </span>
      </span>
    </label>
  );
}

function TreeRow({
  depth,
  expanded,
  hasChildren,
  checkState: state,
  checkDisabled,
  label,
  onToggleExpanded,
  onToggleCheck,
}: {
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  checkState: "none" | "some" | "all";
  checkDisabled: boolean;
  label: string;
  onToggleExpanded: () => void;
  onToggleCheck: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 py-1.5 pr-2",
        depth === 0 && "pl-2",
        depth === 1 && "pl-7",
        depth === 2 && "pl-12",
      )}
    >
      {hasChildren ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square shrink-0"
          onClick={onToggleExpanded}
        >
          <span
            className={cn(
              "icon-[material-symbols--chevron-right] text-lg transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>
      ) : (
        <span className="btn btn-xs btn-square invisible shrink-0" />
      )}
      <TriStateCheckbox
        state={state}
        disabled={checkDisabled}
        onToggle={onToggleCheck}
      />
      <span className="min-w-0 text-sm font-medium wrap-break-word">
        {label}
      </span>
    </div>
  );
}

function TriStateCheckbox({
  state,
  disabled,
  onToggle,
}: {
  state: "none" | "some" | "all";
  disabled?: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="checkbox checkbox-xs shrink-0"
      checked={state === "all"}
      disabled={disabled}
      onChange={onToggle}
    />
  );
}
