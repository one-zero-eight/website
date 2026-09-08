import type { SchemaReviewSlot } from "@/api/schedule-assistant/types.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { cn } from "@/lib/ui/cn";
import {
  BOOKING_STATUS_ORDER,
  type BookingReviewItem,
  type BookingSlotStatus,
  countSlotStatuses,
  disabledReasonLabel,
  formatReviewSlotLabel,
  slotStatus,
} from "./bookingModel.ts";

const STATUS_DOT_CLASS: Record<BookingSlotStatus, string> = {
  ready: "bg-base-content/40",
  booked: "bg-success",
  conflict: "bg-warning",
  disabled: "bg-error",
  online: "bg-base-content/25",
  pending_approval: "bg-info",
  unknown: "bg-warning",
  declined: "bg-error",
  cancelling: "bg-warning",
};

export const BOOKING_STATUS_LABEL: Record<BookingSlotStatus, string> = {
  ready: "Можно отправить",
  booked: "Подтверждено",
  conflict: "Конфликт",
  disabled: "Нельзя бронировать",
  online: "Онлайн",
  pending_approval: "Ожидает утверждения",
  unknown: "Требуется проверка",
  declined: "Отклонено",
  cancelling: "Отменяется",
};

function StatusDot({ status }: { status: BookingSlotStatus }) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        STATUS_DOT_CLASS[status],
      )}
    />
  );
}

export function BookingSlotStatusMark({ slot }: { slot: SchemaReviewSlot }) {
  const status = slotStatus(slot);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <StatusDot status={status} />
      {BOOKING_STATUS_LABEL[status]}
      {status === "disabled"
        ? ` · ${disabledReasonLabel(slot.disabled_reason)}`
        : ""}
      {slot.partially_booked ? " · Частичное покрытие" : ""}
    </span>
  );
}

export function BookingGroupStatusMarks({
  items,
  showComponent = false,
}: {
  items: BookingReviewItem[];
  showComponent?: boolean;
}) {
  const counts = countSlotStatuses(items.map((item) => item.slot));
  return (
    <span
      className="flex flex-wrap items-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      {BOOKING_STATUS_ORDER.filter((status) => counts[status] > 0).map(
        (status) => (
          <Tooltip
            key={status}
            content={
              <div className="flex max-w-sm flex-col gap-1 text-sm">
                <p className="font-medium">
                  {BOOKING_STATUS_LABEL[status]}: {counts[status]}
                </p>
                {items
                  .filter((item) => slotStatus(item.slot) === status)
                  .slice(0, 5)
                  .map((item) => (
                    <p key={item.slot.slot_id}>
                      {showComponent ? `${item.componentLabel}: ` : ""}
                      {formatReviewSlotLabel(item.slot)}
                    </p>
                  ))}
                {counts[status] > 5 ? <p>и ещё {counts[status] - 5}</p> : null}
              </div>
            }
          >
            <span className="inline-flex items-center gap-1 text-xs">
              <StatusDot status={status} />
              {BOOKING_STATUS_LABEL[status]}: {counts[status]}
            </span>
          </Tooltip>
        ),
      )}
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
      {BOOKING_STATUS_ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <StatusDot status={status} />
          {BOOKING_STATUS_LABEL[status]}: {stats[status]}
        </span>
      ))}
      {extraCount > 0 ? <span>Лишние: {extraCount}</span> : null}
    </div>
  );
}
