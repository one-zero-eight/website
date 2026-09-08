import { useRef, useState } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { $scheduleAssistant } from "@/api/schedule-assistant/index.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  BookingOutcome,
  CancelBookingRequestScope,
  type SchemaBookingTask,
  type SchemaBookingTaskItem,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { BOOKING_TASKS_QUERY_KEY } from "./useBookingTasks.ts";
import { mergeBookingTasks } from "./bookingModel.ts";

export function BookingCancelButton({
  item,
  booking,
  disabled = false,
  occurrenceDates,
}: {
  item?: SchemaBookingTaskItem;
  booking?: { id: string; title: string };
  disabled?: boolean;
  occurrenceDates?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<CancelBookingRequestScope | null>(null);
  const [date, setDate] = useState("");
  const submitting = useRef(false);
  const queryClient = useQueryClient();
  const cancellingCount = useIsMutating({
    mutationKey: ["post", "/bookings/cancel"],
  });
  const { showError, showInfo } = useToast();
  const cancel = $scheduleAssistant.useMutation("post", "/bookings/cancel", {
    onSuccess: async (task) => {
      await queryClient.cancelQueries({ queryKey: BOOKING_TASKS_QUERY_KEY });
      queryClient.setQueryData<SchemaBookingTask[]>(
        BOOKING_TASKS_QUERY_KEY,
        (current) => mergeBookingTasks(current ?? [], [task]),
      );
      setOpen(false);
      showInfo(
        "Отмена запрошена",
        "Исчезновение события из комнаты проверяется отдельно. Не отправляйте повторный запрос.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: BOOKING_TASKS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: $scheduleAssistant.queryOptions("get", "/bookings/review")
            .queryKey,
        }),
      ]);
    },
    onError: async (error) => {
      showError("Не удалось подтвердить отмену", formatApiErrorMessage(error));
      await queryClient.invalidateQueries({
        queryKey: BOOKING_TASKS_QUERY_KEY,
      });
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  if (
    (!booking && (!item?.can_cancel || !item.operation_id)) ||
    item?.cancellation_scope ||
    item?.outcome === BookingOutcome.cancelled ||
    item?.outcome === BookingOutcome.cancel_requested
  )
    return null;
  const valid =
    scope === CancelBookingRequestScope.series ||
    (scope === CancelBookingRequestScope.occurrence &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      (!occurrenceDates || occurrenceDates.includes(date)));

  function handleConfirm() {
    if (
      !valid ||
      !scope ||
      (!item?.operation_id && !booking?.id) ||
      disabled ||
      queryClient.isMutating({ mutationKey: ["post", "/bookings/cancel"] }) >
        0 ||
      submitting.current
    )
      return;
    submitting.current = true;
    cancel.mutate({
      body: {
        operation_ids: item?.operation_id ? [item.operation_id] : [],
        booking_ids: booking ? [booking.id] : [],
        scope,
        occurrence_date:
          scope === CancelBookingRequestScope.occurrence ? date : null,
      },
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-warning btn-xs mt-2 self-start"
        disabled={disabled || cancellingCount > 0}
        onClick={() => {
          setScope(null);
          setDate("");
          setOpen(true);
        }}
      >
        Отменить свой запрос
      </button>
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!cancel.isPending) setOpen(value);
        }}
        title="Выберите область отмены"
      >
        <p className="text-sm wrap-break-word whitespace-pre-wrap">
          {item?.title ?? booking?.title}
        </p>
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              className="radio radio-sm"
              checked={scope === CancelBookingRequestScope.series}
              onChange={() => setScope(CancelBookingRequestScope.series)}
              disabled={cancel.isPending}
            />
            Весь запрос / вся повторяющаяся серия
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              className="radio radio-sm"
              checked={scope === CancelBookingRequestScope.occurrence}
              onChange={() => setScope(CancelBookingRequestScope.occurrence)}
              disabled={cancel.isPending}
            />
            Только одно занятие
          </label>
          {scope === CancelBookingRequestScope.occurrence ? (
            <label className="flex flex-col gap-1">
              Дата занятия (МСК)
              {occurrenceDates ? (
                <select
                  className="select w-full"
                  value={date}
                  disabled={cancel.isPending}
                  onChange={(event) => setDate(event.target.value)}
                >
                  <option value="">Выберите дату</option>
                  {occurrenceDates.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="date"
                  className="input w-full"
                  value={date}
                  disabled={cancel.isPending}
                  onChange={(event) => setDate(event.target.value)}
                />
              )}
            </label>
          ) : null}
          {scope === CancelBookingRequestScope.series ? (
            <p className="text-warning">
              Будут отменены все повторения этого запроса, включая будущие
              занятия.
            </p>
          ) : null}
          <p>
            Отправка отмены не означает, что событие уже удалено из комнаты. До
            сверки запрос останется «Отменяется».
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={cancel.isPending}
            onClick={() => setOpen(false)}
          >
            Назад
          </button>
          <button
            type="button"
            className="btn btn-warning"
            disabled={!valid || disabled || cancellingCount > 0}
            onClick={handleConfirm}
          >
            {cancel.isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            {scope === CancelBookingRequestScope.series
              ? "Отменить весь запрос"
              : "Отменить выбранное занятие"}
          </button>
        </div>
      </Modal>
    </>
  );
}
