import type { ReactNode } from "react";

import type { SchemaReviewSlot } from "@/api/schedule-assistant/types.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import {
  BOOKING_STATUS_ORDER,
  type BookingReviewItem,
  type BookingSlotStatus,
  countSlotStatuses,
  disabledReasonLabel,
  formatConflictWhen,
  formatReviewSlotLabel,
  slotStatus,
} from "@/components/schedule-assistant/bookings/bookingModel.ts";
import { cn } from "@/lib/ui/cn";

const STATUS_DOT_CLASS: Record<BookingSlotStatus, string> = {
  ready: "bg-success",
  booked: "bg-info",
  conflict: "bg-warning",
  disabled: "bg-error",
  online: "bg-base-content/25",
};

const STATUS_TITLE: Record<BookingSlotStatus, string> = {
  ready: "OK",
  booked: "Забронировано",
  conflict: "Конфликт",
  disabled: "Нельзя бронировать",
  online: "Онлайн",
};

const STATUS_LEGEND_LABEL: Record<BookingSlotStatus, string> = {
  ready: "OK",
  booked: "Забронировано",
  conflict: "Конфликт",
  disabled: "Нельзя",
  online: "Онлайн",
};

const LEGEND_STATUS_ORDER: BookingSlotStatus[] = [
  "ready",
  "booked",
  "conflict",
  "disabled",
  "online",
];

const MAX_TOOLTIP_ITEMS = 5;

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-base-content/60 text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </div>
  );
}

function TooltipSection({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

function StatusDot({
  status,
  content,
}: {
  status: BookingSlotStatus;
  content: ReactNode;
}) {
  return (
    <Tooltip content={content}>
      <span
        className={cn(
          "inline-block size-2.5 shrink-0 rounded-full",
          STATUS_DOT_CLASS[status],
        )}
        onClick={(event) => event.stopPropagation()}
      />
    </Tooltip>
  );
}

function conflictHitLabel(hit: SchemaReviewSlot["conflicts"][number]) {
  const room = hit.room_id ? ` · ${hit.room_id}` : "";
  const title = hit.title ? ` · ${hit.title}` : "";
  return `${formatConflictWhen(hit.start, hit.end)}${room}${title}`;
}

function slotConflictLines(slot: SchemaReviewSlot) {
  return slot.conflicts
    .slice(0, MAX_TOOLTIP_ITEMS)
    .map((hit, index) => (
      <li key={`${hit.start}-${hit.room_id}-${index}`}>
        {conflictHitLabel(hit)}
      </li>
    ));
}

function GroupItemLine({
  item,
  showComponent,
}: {
  item: BookingReviewItem;
  showComponent: boolean;
}) {
  const { slot } = item;
  const status = slotStatus(slot);
  const remainingConflicts = slot.conflicts.length - MAX_TOOLTIP_ITEMS;

  return (
    <li className="flex flex-col gap-0.5">
      {showComponent ? (
        <div className="font-medium">{item.componentLabel}</div>
      ) : null}
      <div>{formatReviewSlotLabel(slot)}</div>
      {status === "disabled" ? (
        <div className="text-base-content/80">
          {disabledReasonLabel(slot.disabled_reason) || "недоступно"}
        </div>
      ) : null}
      {status === "online" ? (
        <div className="text-base-content/80">
          занятие онлайн, аудитория не бронируется
        </div>
      ) : null}
      {status === "booked" ? (
        <div className="text-base-content/80">
          {slot.room
            ? `уже есть бронь · ${slot.room}`
            : "уже есть бронь в Outlook"}
        </div>
      ) : null}
      {status === "conflict" ? (
        slot.conflicts.length > 0 ? (
          <>
            <ul className="text-base-content/80 flex flex-col gap-0.5">
              {slotConflictLines(slot)}
            </ul>
            {remainingConflicts > 0 ? (
              <div className="text-base-content/60">
                и ещё {remainingConflicts}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-base-content/80">
            пересечение с другим бронированием
          </div>
        )
      ) : null}
    </li>
  );
}

export function BookingSlotStatusMark({ slot }: { slot: SchemaReviewSlot }) {
  const status = slotStatus(slot);
  const remaining = slot.conflicts.length - MAX_TOOLTIP_ITEMS;

  return (
    <StatusDot
      status={status}
      content={
        <div className="flex max-w-xs flex-col gap-2 py-0.5">
          {status === "ready" ? (
            <TooltipSection title={STATUS_TITLE.ready} />
          ) : null}
          {status === "booked" ? (
            <TooltipSection title={STATUS_TITLE.booked}>
              <div className="text-sm">
                {slot.room
                  ? `уже есть бронь · ${slot.room}`
                  : "уже есть бронь в Outlook"}
              </div>
            </TooltipSection>
          ) : null}
          {status === "disabled" ? (
            <TooltipSection title={STATUS_TITLE.disabled}>
              <div className="text-sm">
                {disabledReasonLabel(slot.disabled_reason) || "недоступно"}
              </div>
            </TooltipSection>
          ) : null}
          {status === "online" ? (
            <TooltipSection title={STATUS_TITLE.online}>
              <div className="text-sm">
                занятие онлайн, аудитория не бронируется
              </div>
            </TooltipSection>
          ) : null}
          {status === "conflict" ? (
            <TooltipSection title={STATUS_TITLE.conflict}>
              {slot.conflicts.length > 0 ? (
                <>
                  <ul className="flex flex-col gap-1 text-sm">
                    {slotConflictLines(slot)}
                  </ul>
                  {remaining > 0 ? (
                    <div className="text-base-content/60 text-sm">
                      и ещё {remaining}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-sm">
                  Пересечение с другим бронированием
                </div>
              )}
            </TooltipSection>
          ) : null}
        </div>
      }
    />
  );
}

export function BookingGroupStatusMarks({
  items,
  showComponent = false,
}: {
  items: BookingReviewItem[];
  showComponent?: boolean;
}) {
  const slots = items.map((item) => item.slot);
  const counts = countSlotStatuses(slots);
  const present = BOOKING_STATUS_ORDER.filter((status) => counts[status] > 0);
  if (present.length === 0) return null;

  return (
    <span
      className="flex shrink-0 items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {present.map((status) => {
        const count = counts[status];
        const matching = items.filter(
          (item) => slotStatus(item.slot) === status,
        );
        const visible = matching.slice(0, MAX_TOOLTIP_ITEMS);
        const remaining = matching.length - visible.length;
        const showList =
          status === "conflict" || status === "disabled" || status === "booked";

        return (
          <StatusDot
            key={status}
            status={status}
            content={
              <div className="flex max-w-xs flex-col gap-2 py-0.5">
                <TooltipSection title={`${STATUS_TITLE[status]}: ${count}`}>
                  {showList ? (
                    <>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {visible.map((item) => (
                          <GroupItemLine
                            key={item.slot.slot_id}
                            item={item}
                            showComponent={showComponent}
                          />
                        ))}
                      </ul>
                      {remaining > 0 ? (
                        <div className="text-base-content/60 text-sm">
                          и ещё {remaining}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </TooltipSection>
              </div>
            }
          />
        );
      })}
    </span>
  );
}

export function BookingStatusLegend({
  stats,
  extraCount,
}: {
  stats: Record<BookingSlotStatus, number>;
  extraCount: number;
}) {
  return (
    <div className="text-base-content/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {LEGEND_STATUS_ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2.5 shrink-0 rounded-full",
              STATUS_DOT_CLASS[status],
            )}
          />
          {STATUS_LEGEND_LABEL[status]}: {stats[status]}
        </span>
      ))}
      {extraCount > 0 ? <span>Лишние: {extraCount}</span> : null}
    </div>
  );
}
