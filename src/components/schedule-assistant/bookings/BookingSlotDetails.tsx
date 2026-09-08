import { useQuery } from "@tanstack/react-query";
import type {
  SchemaReviewSlot,
  SchemaBookingTask,
} from "@/api/schedule-assistant/types.ts";
import { BOOKING_TASKS_QUERY_KEY } from "./useBookingTasks.ts";
import { BookingCancelButton } from "./BookingCancelButton.tsx";
import { formatDisplayDate } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import {
  calendarPresenceLabel,
  formatCheckedAt,
  roomResponseLabel,
} from "./bookingModel.ts";

export function BookingSlotDetails({ slot }: { slot: SchemaReviewSlot }) {
  const {
    data: tasks,
    isError,
    isPending,
    isFetching,
  } = useQuery<SchemaBookingTask[]>({
    queryKey: BOOKING_TASKS_QUERY_KEY,
    enabled: false,
  });
  const operations = [
    ...new Map(
      (tasks ?? [])
        .flatMap((task) => task.items)
        .filter(
          (item) =>
            item.slot_ids.includes(slot.slot_id) &&
            item.operation_id &&
            !item.cancellation_scope,
        )
        .map((item) => [item.operation_id, item]),
    ).values(),
  ];
  return (
    <div className="bg-base-200 mx-3 mb-2 flex flex-col gap-2 rounded-lg p-3 text-sm @md/content:ml-24">
      <p>Ответ комнаты: {roomResponseLabel(slot.room_response)}</p>
      <p>Календарь комнаты: {calendarPresenceLabel(slot.room_presence)}</p>
      <p>Последняя проверка (МСК): {formatCheckedAt(slot.checked_at)}</p>
      {operations.length === 0 ? (
        <p>Календарь организатора: нет сохранённых свидетельств</p>
      ) : null}
      {operations.map((item) => (
        <div
          key={item.operation_id}
          className="border-base-300 rounded-lg border p-2"
        >
          <p>
            Календарь организатора:{" "}
            {calendarPresenceLabel(item.organizer_presence)}
          </p>
          <p>Проверено (МСК): {formatCheckedAt(item.checked_at)}</p>
          <BookingCancelButton
            item={item}
            disabled={isError || isPending || isFetching}
            occurrenceDates={slot.occurrence_dates}
          />
        </div>
      ))}
      {slot.can_cancel
        ? slot.booking_ids
            .filter(
              (id) =>
                !operations.some((item) => item.outlook_booking_id === id),
            )
            .map((id) => (
              <BookingCancelButton
                key={id}
                booking={{ id, title: slot.label }}
                disabled={isError || isPending || isFetching}
                occurrenceDates={slot.occurrence_dates}
              />
            ))
        : null}
      {slot.message_body ? (
        <p className="wrap-break-word whitespace-pre-wrap">
          {slot.message_body}
        </p>
      ) : null}
      {slot.occurrence_dates.length > 0 ? (
        <>
          <p>
            Найдено дат: {slot.covered_dates.length} /{" "}
            {slot.occurrence_dates.length}. Наличие события не заменяет ответ
            комнаты.
          </p>
          <p>
            Все даты:{" "}
            {slot.occurrence_dates
              .map((date) => formatDisplayDate(date))
              .join(", ")}
          </p>
        </>
      ) : null}
      {slot.covered_dates.length > 0 ? (
        <p>
          Найденные даты:{" "}
          {slot.covered_dates.map((date) => formatDisplayDate(date)).join(", ")}
        </p>
      ) : null}
      {slot.missing_dates.length > 0 ? (
        <p className="text-warning">
          Отсутствуют или не проверены:{" "}
          {slot.missing_dates.map((date) => formatDisplayDate(date)).join(", ")}
        </p>
      ) : null}
      <p className="text-base-content/60 text-xs">
        Проверка занятости ограничена 62 днями. Даты за пределами проверенного
        периода не считаются свободными.
      </p>
    </div>
  );
}
