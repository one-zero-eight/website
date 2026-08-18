import { $scheduleAssistant } from "@/api/schedule-assistant/index.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  BatchBookItemResultStatus,
  type SchemaBatchBookResponse,
  type SchemaBookingReview,
  type SchemaCancelExtraResponse,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { CopyableTextModal } from "@/components/schedule-assistant/CopyableTextModal.tsx";
import { BookingTree } from "@/components/schedule-assistant/bookings/BookingTree.tsx";
import { BookingStatusLegend } from "@/components/schedule-assistant/bookings/BookingStatusMark.tsx";
import {
  buildConflictModes,
  collectReadySlotIds,
  countStats,
  componentNodeId,
  extraIds,
  EXTRA_NODE_ID,
  formatConflictsText,
  formatReviewSlotLabel,
  isReadySlot,
  isSplitSelectableSlot,
  programNodeId,
  pruneSelectedIds,
  slotById,
} from "@/components/schedule-assistant/bookings/bookingModel.ts";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

const BMP_TIMEOUT_MS = 5 * 60 * 1000;

type ConfirmAction = "book" | "cancel-extra";

type ActionResults =
  | { kind: "book"; response: SchemaBatchBookResponse }
  | { kind: "cancel"; response: SchemaCancelExtraResponse };

export function BookingWorkspace() {
  const { showError, showSuccess, showWarning } = useToast();
  const queryClient = useQueryClient();
  const initializedExpandRef = useRef(false);

  const { data, isPending, isError, error, refetch, isFetching } =
    $scheduleAssistant.useQuery("get", "/bookings/review", undefined, {
      refetchOnWindowFocus: false,
    });

  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [expandedConflictIds, setExpandedConflictIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [actionResults, setActionResults] = useState<ActionResults | null>(
    null,
  );
  const [conflictsTextOpen, setConflictsTextOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    const validSlotIds: string[] = [];
    for (const program of data.programs) {
      for (const course of program.courses) {
        for (const component of course.components) {
          for (const slot of component.slots) {
            if (isReadySlot(slot) || isSplitSelectableSlot(slot)) {
              validSlotIds.push(slot.slot_id);
            }
          }
        }
      }
    }
    setSelectedSlotIds((prev) => pruneSelectedIds(prev, validSlotIds));
    setSelectedExtraIds((prev) => pruneSelectedIds(prev, extraIds(data)));
  }, [data]);

  useEffect(() => {
    if (!data || initializedExpandRef.current) return;
    initializedExpandRef.current = true;
    const next = new Set<string>([EXTRA_NODE_ID]);
    for (const program of data.programs) {
      next.add(programNodeId(program.program_id));
      for (const course of program.courses) {
        for (const component of course.components) {
          next.add(
            componentNodeId(
              program.program_id,
              course.course_id,
              component.component_id,
            ),
          );
        }
      }
    }
    setExpandedIds(next);
  }, [data]);

  const stats = useMemo(() => (data ? countStats(data) : null), [data]);
  const readyIds = useMemo(
    () => (data ? collectReadySlotIds(data) : []),
    [data],
  );
  const conflictsText = useMemo(
    () => (data ? formatConflictsText(data) : ""),
    [data],
  );

  const invalidateReview = () =>
    queryClient.invalidateQueries({
      queryKey: $scheduleAssistant.queryOptions("get", "/bookings/review")
        .queryKey,
    });

  const { mutate: bookSlots, isPending: isBooking } =
    $scheduleAssistant.useMutation("post", "/bookings/batch", {
      onSuccess: (response) => {
        setActionResults({ kind: "book", response });
        const failed = response.results.filter(
          (item) => item.status === BatchBookItemResultStatus.error,
        ).length;
        if (failed > 0) {
          showWarning(
            "Бронирование завершено с ошибками",
            `Успешно: ${response.results.length - failed}, ошибок: ${failed}`,
          );
        } else {
          showSuccess(
            "Бронирование выполнено",
            `Отправлено слотов: ${response.submitted}`,
          );
        }
        setSelectedSlotIds(new Set());
        void invalidateReview();
      },
      onError: (mutationError) => {
        showError("Ошибка бронирования", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: cancelExtras, isPending: isCancelling } =
    $scheduleAssistant.useMutation("post", "/bookings/cancel-extra", {
      onSuccess: (response) => {
        setActionResults({ kind: "cancel", response });
        const failedCount = Object.keys(response.failed).length;
        if (failedCount > 0) {
          showWarning(
            "Отмена завершена с ошибками",
            `Отменено: ${response.cancelled.length}, ошибок: ${failedCount}`,
          );
        } else {
          showSuccess(
            "Лишние бронирования отменены",
            `Отменено: ${response.cancelled.length}`,
          );
        }
        setSelectedExtraIds(new Set());
        void invalidateReview();
      },
      onError: (mutationError) => {
        showError("Ошибка отмены", formatApiErrorMessage(mutationError));
      },
    });

  const busy = isBooking || isCancelling;

  function handleToggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleSlots(ids: string[], selected: boolean) {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function handleToggleExtras(ids: string[], selected: boolean) {
    setSelectedExtraIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function handleToggleConflictDetails(slotId: string) {
    setExpandedConflictIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  }

  function handleConfirm() {
    if (!data || confirmAction === null) return;
    if (confirmAction === "book") {
      bookSlots({
        body: {
          slot_ids: [...selectedSlotIds],
          conflict_modes: buildConflictModes(data, selectedSlotIds),
        },
        signal: AbortSignal.timeout(BMP_TIMEOUT_MS),
      });
    } else {
      cancelExtras({
        body: { extra_ids: [...selectedExtraIds] },
        signal: AbortSignal.timeout(BMP_TIMEOUT_MS),
      });
    }
    setConfirmAction(null);
  }

  if (isPending) {
    return (
      <div className="flex w-full flex-col gap-3 p-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex w-full flex-col items-start gap-3 p-4">
        <h1 className="text-xl font-semibold">Бронирование</h1>
        <p className="text-error">{formatApiErrorMessage(error)}</p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => refetch()}
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold">Бронирование</h1>
          <p className="text-base-content/70 text-sm">
            Бронирование аудиторий по сохранённому конфигу семестра. Запрос в
            Outlook может занять несколько минут.
          </p>
          {stats ? (
            <BookingStatusLegend
              stats={stats}
              extraCount={data.extra_auto_bookings.length}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFetching || busy ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy || isFetching}
            onClick={() => refetch()}
          >
            Обновить
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy || readyIds.length === 0}
          onClick={() => handleToggleSlots(readyIds, true)}
        >
          Выбрать все
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || selectedSlotIds.size === 0}
          onClick={() => setSelectedSlotIds(new Set())}
        >
          Сбросить
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || selectedSlotIds.size === 0}
          onClick={() => setConfirmAction("book")}
        >
          {isBooking ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <span className="icon-[material-symbols--event-available-outline] text-lg" />
          )}
          Забронировать ({selectedSlotIds.size})
        </button>
        <button
          type="button"
          className="btn btn-warning btn-sm"
          disabled={busy || selectedExtraIds.size === 0}
          onClick={() => setConfirmAction("cancel-extra")}
        >
          {isCancelling ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <span className="icon-[material-symbols--event-busy-outline] text-lg" />
          )}
          Отменить лишние ({selectedExtraIds.size})
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || isFetching || !stats?.conflict}
          onClick={() => setConflictsTextOpen(true)}
        >
          <span className="icon-[material-symbols--notes] text-lg" />
          Конфликты текстом
        </button>
      </div>

      {busy ? (
        <p className="text-base-content/70 text-sm">
          Запрос к BMP может занять до пяти минут. Не закрывайте страницу.
        </p>
      ) : null}

      {data.programs.length === 0 && data.extra_auto_bookings.length === 0 ? (
        <div className="border-base-300 bg-base-100 rounded-box flex min-h-48 items-center justify-center border p-6 text-center">
          <p className="text-base-content/70 text-sm">
            Нет слотов для бронирования.
          </p>
        </div>
      ) : (
        <BookingTree
          review={data}
          expandedIds={expandedIds}
          selectedSlotIds={selectedSlotIds}
          selectedExtraIds={selectedExtraIds}
          expandedConflictIds={expandedConflictIds}
          disabled={busy}
          onToggleExpanded={handleToggleExpanded}
          onToggleSlots={handleToggleSlots}
          onToggleExtras={handleToggleExtras}
          onToggleConflictDetails={handleToggleConflictDetails}
        />
      )}

      {actionResults ? <ActionResultsPanel results={actionResults} /> : null}

      <CopyableTextModal
        open={conflictsTextOpen}
        text={conflictsText}
        title="Конфликты текстом"
        copiedDescription="Текст конфликтов скопирован"
        onOpenChange={setConflictsTextOpen}
      />

      <ConfirmModal
        open={confirmAction !== null}
        action={confirmAction}
        review={data}
        selectedSlotIds={selectedSlotIds}
        selectedExtraIds={selectedExtraIds}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function ConfirmModal({
  open,
  action,
  review,
  selectedSlotIds,
  selectedExtraIds,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  action: ConfirmAction | null;
  review: SchemaBookingReview;
  selectedSlotIds: ReadonlySet<string>;
  selectedExtraIds: ReadonlySet<string>;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const lastActionRef = useRef<ConfirmAction>("book");
  if (action !== null) lastActionRef.current = action;
  const isBook = (action ?? lastActionRef.current) === "book";
  const labels = isBook
    ? [...selectedSlotIds].map((id) => {
        const slot = slotById(review, id);
        return {
          id,
          label: slot ? formatReviewSlotLabel(slot) : id,
        };
      })
    : review.extra_auto_bookings
        .filter((item) => selectedExtraIds.has(item.extra_id))
        .map((item) => ({ id: item.extra_id, label: item.label }));
  const preview = labels.slice(0, 12);
  const rest = labels.length - preview.length;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isBook ? "Забронировать слоты?" : "Отменить лишние бронирования?"}
    >
      <p className="text-base-content/80 text-sm">
        {isBook
          ? `Будет отправлено в BMP: ${selectedSlotIds.size}`
          : `Будет отменено: ${selectedExtraIds.size}`}
      </p>
      <ul className="mt-2 max-h-64 overflow-auto text-sm">
        {preview.map((item) => (
          <li
            key={item.id}
            className="text-base-content/80 py-0.5 wrap-break-word"
          >
            {item.label}
          </li>
        ))}
      </ul>
      {rest > 0 ? (
        <p className="text-base-content/60 mt-1 text-sm">и ещё {rest}</p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onOpenChange(false)}
        >
          Отмена
        </button>
        <button
          type="button"
          className={isBook ? "btn btn-primary" : "btn btn-warning"}
          onClick={onConfirm}
        >
          {isBook ? "Забронировать" : "Отменить лишние"}
        </button>
      </div>
    </Modal>
  );
}

function ActionResultsPanel({ results }: { results: ActionResults }) {
  if (results.kind === "book") {
    const { response } = results;
    return (
      <div className="border-base-300 bg-base-100 rounded-box border p-3">
        <h2 className="mb-2 font-medium">Результат бронирования</h2>
        <p className="text-base-content/70 mb-2 text-sm">
          Отправлено: {response.submitted}
        </p>
        <ul className="flex flex-col gap-1">
          {response.results.map((item) => (
            <li
              key={item.index}
              className="flex items-start gap-2 text-sm wrap-break-word"
            >
              <span
                className={
                  item.status === BatchBookItemResultStatus.ok
                    ? "badge badge-success badge-sm shrink-0"
                    : "badge badge-error badge-sm shrink-0"
                }
              >
                {item.status === BatchBookItemResultStatus.ok ? "OK" : "Ошибка"}
              </span>
              <span>
                {item.title ?? `#${item.index}`}
                {item.error ? `: ${item.error}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const failedEntries = Object.entries(results.response.failed);
  return (
    <div className="border-base-300 bg-base-100 rounded-box border p-3">
      <h2 className="mb-2 font-medium">Результат отмены</h2>
      <p className="text-base-content/70 mb-2 text-sm">
        Отменено: {results.response.cancelled.length}
      </p>
      {results.response.cancelled.map((id) => (
        <p key={id} className="text-success text-sm wrap-break-word">
          {id}
        </p>
      ))}
      {failedEntries.map(([id, message]) => (
        <p key={id} className="text-error text-sm wrap-break-word">
          {id}: {message}
        </p>
      ))}
    </div>
  );
}
