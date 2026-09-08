import { useState } from "react";
import { BookingCancelButton } from "./BookingCancelButton.tsx";
import {
  BookingOutcome,
  BookingTaskItemStatus,
  BookingTaskKind,
  type SchemaBookingTask,
} from "@/api/schedule-assistant/types.ts";
import { cn } from "@/lib/ui/cn";
import {
  calendarPresenceLabel,
  formatCheckedAt,
  formatTaskOutcomeSummary,
  isActiveTask,
  roomResponseLabel,
  taskItemLabel,
} from "./bookingModel.ts";

export function BookingTaskPanel({
  task,
  onRefresh,
  refreshing,
}: {
  task: SchemaBookingTask;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const active = isActiveTask(task);
  return (
    <div className="border-base-300 bg-base-100 rounded-box border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="font-medium">
          {task.kind === BookingTaskKind.book
            ? "Запросы бронирования"
            : "Отмена запросов"}
        </h2>
        {active ? (
          <span className="loading loading-spinner loading-sm" />
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm ml-auto"
          disabled={refreshing}
          onClick={onRefresh}
        >
          Перепроверить
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Свернуть" : "Развернуть"}
        </button>
      </div>
      <p className="text-base-content/70 text-sm">
        Обработано: {task.done}/{task.total} · Отправлено: {task.sent}/
        {task.total}
      </p>
      <p className="my-2 text-sm">{formatTaskOutcomeSummary(task)}</p>
      <p className="text-base-content/60 text-xs">
        Завершение отправки не означает утверждение. Сворачивание панели не
        прекращает отслеживание.
      </p>
      {task.error ? (
        <p className="text-error my-2 text-sm wrap-break-word whitespace-pre-wrap">
          {task.error}
        </p>
      ) : null}
      {expanded ? (
        <ul className="mt-3 flex max-h-96 flex-col gap-2 overflow-auto">
          {task.items.map((item) => (
            <li
              key={item.operation_id ?? item.index}
              className="border-base-300 rounded-lg border p-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "badge badge-sm",
                    item.outcome === BookingOutcome.accepted ||
                      item.outcome === BookingOutcome.cancelled
                      ? "badge-success"
                      : item.outcome === BookingOutcome.declined
                        ? "badge-error"
                        : "badge-warning",
                  )}
                >
                  {taskItemLabel(item)}
                </span>
                <span className="wrap-break-word">
                  {item.title ?? `#${item.index}`}
                </span>
              </div>
              {item.status === BookingTaskItemStatus.error ? (
                <p className="text-error">
                  Ошибка операции; итог комнаты показан отдельно.
                </p>
              ) : null}
              {item.error ? (
                <p className="text-error wrap-break-word whitespace-pre-wrap">
                  {item.error}
                </p>
              ) : null}
              <details className="mt-1">
                <summary className="cursor-pointer">
                  Ответ комнаты и свидетельства
                </summary>
                <div className="text-base-content/70 mt-1 flex flex-col gap-1">
                  <p>Ответ комнаты: {roomResponseLabel(item.room_response)}</p>
                  <p>
                    Календарь организатора:{" "}
                    {calendarPresenceLabel(item.organizer_presence)}
                  </p>
                  <p>
                    Календарь комнаты:{" "}
                    {calendarPresenceLabel(item.room_presence)}
                  </p>
                  <p>Проверено (МСК): {formatCheckedAt(item.checked_at)}</p>
                  {item.evidence.length > 0 ? (
                    <ul className="list-disc pl-4">
                      {item.evidence.map((evidence, index) => (
                        <li key={index} className="wrap-break-word">
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.message_body ? (
                    <p className="wrap-break-word whitespace-pre-wrap">
                      {item.message_body}
                    </p>
                  ) : null}
                  {item.cancellation_scope ? (
                    <p>
                      Область отмены:{" "}
                      {item.cancellation_scope === "series"
                        ? "Вся серия"
                        : `Повторение ${item.occurrence_date}`}
                    </p>
                  ) : null}
                </div>
              </details>
              <BookingCancelButton
                item={item}
                disabled={refreshing || active}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
