import { $scheduleAssistant } from "@/api/schedule-assistant/index.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  BookingTaskItemStatus,
  BookingTaskKind,
  BookingTaskStatus,
  type SchemaBookingReview,
  type SchemaBookingTask,
  type SchemaBookingTaskItem,
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
  groupSelectedSlotsForConfirm,
  isReadySlot,
  isSplitSelectableSlot,
  programNodeId,
  pruneSelectedIds,
} from "@/components/schedule-assistant/bookings/bookingModel.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { T } from "@/lib/utils/dates";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

const BOOKING_TASK_STORAGE_KEY = "schedule-assistant:booking-task";

type ConfirmAction = "book" | "cancel-extra";

type StoredBookingTask = {
  id: string;
  toasted: boolean;
};

function readStoredBookingTask(): StoredBookingTask | null {
  const raw = sessionStorage.getItem(BOOKING_TASK_STORAGE_KEY);
  if (!raw) return null;
  const parsed: { id?: unknown; toasted?: unknown } = JSON.parse(raw);
  if (typeof parsed.id !== "string" || parsed.id.length === 0) return null;
  return { id: parsed.id, toasted: parsed.toasted === true };
}

function writeStoredBookingTask(stored: StoredBookingTask) {
  sessionStorage.setItem(BOOKING_TASK_STORAGE_KEY, JSON.stringify(stored));
}

function clearStoredBookingTask() {
  sessionStorage.removeItem(BOOKING_TASK_STORAGE_KEY);
}

function isTerminalStatus(status: BookingTaskStatus) {
  return (
    status === BookingTaskStatus.done || status === BookingTaskStatus.error
  );
}

function isActiveStatus(status: BookingTaskStatus | undefined) {
  return (
    status === BookingTaskStatus.queued || status === BookingTaskStatus.running
  );
}

export function BookingWorkspace() {
  const { showError, showSuccess, showWarning } = useToast();
  const queryClient = useQueryClient();
  const initializedExpandRef = useRef(false);
  const prevItemStatusRef = useRef(new Map<string, BookingTaskItemStatus>());

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
  const [conflictsTextOpen, setConflictsTextOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(
    () => readStoredBookingTask()?.id ?? null,
  );
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set());

  const {
    data: task,
    isError: isTaskError,
    error: taskError,
  } = $scheduleAssistant.useQuery(
    "get",
    "/bookings/tasks/{task_id}",
    { params: { path: { task_id: taskId ?? "" } } },
    {
      enabled: !!taskId,
      refetchInterval: (query) =>
        isTerminalStatus(query.state.data?.status ?? BookingTaskStatus.queued)
          ? false
          : T.Sec,
    },
  );

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

  useEffect(() => {
    if (!task) return;
    const prev = prevItemStatusRef.current;
    const nextFlash = new Set<string>();
    for (const item of task.items) {
      const previous = prev.get(item.index);
      if (
        previous !== undefined &&
        previous !== item.status &&
        item.status !== BookingTaskItemStatus.pending
      ) {
        nextFlash.add(item.index);
      }
      prev.set(item.index, item.status);
    }
    if (nextFlash.size === 0) return;
    setFlashIds(nextFlash);
    const timer = window.setTimeout(() => setFlashIds(new Set()), 1.5 * T.Sec);
    return () => window.clearTimeout(timer);
  }, [task]);

  const stats = useMemo(() => (data ? countStats(data) : null), [data]);
  const readyIds = useMemo(
    () => (data ? collectReadySlotIds(data) : []),
    [data],
  );
  const conflictsText = useMemo(
    () => (data ? formatConflictsText(data) : ""),
    [data],
  );

  function handleTaskStarted(nextTask: SchemaBookingTask) {
    writeStoredBookingTask({ id: nextTask.task_id, toasted: false });
    prevItemStatusRef.current = new Map(
      nextTask.items.map((item) => [item.index, item.status]),
    );
    setFlashIds(new Set());
    setTaskId(nextTask.task_id);
    queryClient.setQueryData(
      $scheduleAssistant.queryOptions("get", "/bookings/tasks/{task_id}", {
        params: { path: { task_id: nextTask.task_id } },
      }).queryKey,
      nextTask,
    );
  }

  const { mutate: bookSlots, isPending: isBooking } =
    $scheduleAssistant.useMutation("post", "/bookings/batch", {
      onSuccess: handleTaskStarted,
      onError: (mutationError) => {
        showError("Ошибка бронирования", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: cancelExtras, isPending: isCancelling } =
    $scheduleAssistant.useMutation("post", "/bookings/cancel-extra", {
      onSuccess: handleTaskStarted,
      onError: (mutationError) => {
        showError("Ошибка отмены", formatApiErrorMessage(mutationError));
      },
    });

  useEffect(() => {
    if (!task || !isTerminalStatus(task.status)) return;
    const stored = readStoredBookingTask();
    if (stored?.id === task.task_id && stored.toasted) return;
    writeStoredBookingTask({ id: task.task_id, toasted: true });

    const failed = task.items.filter(
      (item) => item.status === BookingTaskItemStatus.error,
    ).length;
    const okCount = task.items.filter(
      (item) => item.status === BookingTaskItemStatus.ok,
    ).length;
    const isBook = task.kind === BookingTaskKind.book;

    if (task.status === BookingTaskStatus.error) {
      showError(
        isBook ? "Ошибка бронирования" : "Ошибка отмены",
        task.error ?? "Задача завершилась с ошибкой",
      );
    } else if (failed > 0) {
      showWarning(
        isBook
          ? "Бронирование завершено с ошибками"
          : "Отмена завершена с ошибками",
        isBook
          ? `Успешно: ${okCount}, ошибок: ${failed}`
          : `Отменено: ${okCount}, ошибок: ${failed}`,
      );
    } else {
      showSuccess(
        isBook ? "Бронирование выполнено" : "Лишние бронирования отменены",
        isBook ? `Забронировано слотов: ${okCount}` : `Отменено: ${okCount}`,
      );
    }

    if (isBook) setSelectedSlotIds(new Set());
    else setSelectedExtraIds(new Set());
    void queryClient.invalidateQueries({
      queryKey: $scheduleAssistant.queryOptions("get", "/bookings/review")
        .queryKey,
    });
  }, [queryClient, showError, showSuccess, showWarning, task]);

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
      });
    } else {
      cancelExtras({
        body: { extra_ids: [...selectedExtraIds] },
      });
    }
    setConfirmAction(null);
  }

  function handleDismissTask() {
    if (taskId) {
      queryClient.removeQueries({
        queryKey: $scheduleAssistant.queryOptions(
          "get",
          "/bookings/tasks/{task_id}",
          { params: { path: { task_id: taskId } } },
        ).queryKey,
      });
    }
    clearStoredBookingTask();
    prevItemStatusRef.current = new Map();
    setFlashIds(new Set());
    setTaskId(null);
    void queryClient.invalidateQueries({
      queryKey: $scheduleAssistant.queryOptions("get", "/bookings/review")
        .queryKey,
    });
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

      {task ? (
        <TaskProgressPanel
          task={task}
          flashIds={flashIds}
          pollError={isTaskError ? formatApiErrorMessage(taskError) : undefined}
          onDismiss={handleDismissTask}
        />
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
  const extraLabels = isBook
    ? []
    : review.extra_auto_bookings
        .filter((item) => selectedExtraIds.has(item.extra_id))
        .map((item) => ({ id: item.extra_id, label: item.label }));
  const extraPreview = extraLabels.slice(0, 12);
  const extraRest = extraLabels.length - extraPreview.length;
  const bookGroups = isBook
    ? groupSelectedSlotsForConfirm(review, selectedSlotIds)
    : [];

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
      {isBook ? (
        <div className="mt-2 max-h-64 overflow-auto text-sm">
          {bookGroups.map((course) => (
            <div key={course.courseId} className="mt-2 first:mt-0">
              <p className="font-medium">{course.course}</p>
              {course.groups.map((group) => (
                <div key={group.groupId} className="mt-1 pl-2">
                  <p className="text-base-content/70">{group.group}</p>
                  <ul className="pl-2">
                    {group.slots.map((slot) => (
                      <li
                        key={slot.id}
                        className="text-base-content/80 py-0.5 wrap-break-word"
                      >
                        {slot.when}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul className="mt-2 max-h-64 overflow-auto text-sm">
            {extraPreview.map((item) => (
              <li
                key={item.id}
                className="text-base-content/80 py-0.5 wrap-break-word"
              >
                {item.label}
              </li>
            ))}
          </ul>
          {extraRest > 0 ? (
            <p className="text-base-content/60 mt-1 text-sm">
              и ещё {extraRest}
            </p>
          ) : null}
        </>
      )}
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

function itemStatusLabel(
  item: SchemaBookingTaskItem,
  kind: BookingTaskKind,
): string {
  if (item.status === BookingTaskItemStatus.pending) return "Ожидание";
  if (item.status === BookingTaskItemStatus.sent) return "Отправлено";
  if (item.status === BookingTaskItemStatus.error) return "Ошибка";
  return kind === BookingTaskKind.cancel ? "Отменено" : "Забронировано";
}

function itemBadgeClass(status: BookingTaskItemStatus): string {
  if (status === BookingTaskItemStatus.ok) return "badge-success";
  if (status === BookingTaskItemStatus.error) return "badge-error";
  if (status === BookingTaskItemStatus.sent) return "badge-info";
  return "badge-ghost";
}

function TaskProgressPanel({
  task,
  flashIds,
  pollError,
  onDismiss,
}: {
  task: SchemaBookingTask;
  flashIds: ReadonlySet<string>;
  pollError?: string;
  onDismiss: () => void;
}) {
  const isBook = task.kind === BookingTaskKind.book;
  const running = isActiveStatus(task.status);
  const items = useMemo(() => {
    const changed = task.items.filter((item) => flashIds.has(item.index));
    const rest = task.items.filter((item) => !flashIds.has(item.index));
    return [...changed, ...rest];
  }, [flashIds, task.items]);
  const title = running
    ? isBook
      ? "Бронирование"
      : "Отмена лишних"
    : isBook
      ? "Результат бронирования"
      : "Результат отмены";

  return (
    <div className="border-base-300 bg-base-100 rounded-box border p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-medium">{title}</h2>
        {running ? (
          <span className="loading loading-spinner loading-sm" />
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm ml-auto"
          onClick={onDismiss}
        >
          Сбросить ожидание
        </button>
      </div>
      {running ? (
        <p className="text-base-content/60 mb-1 text-xs">
          Сброс только закрывает этот экран. Отправка в Outlook продолжается.
        </p>
      ) : null}
      <p className="text-base-content/70 mb-1 text-sm">
        {task.done}/{task.total}
        {task.current ? ` · ${task.current}` : ""}
      </p>
      {isBook ? (
        <p className="text-base-content/70 mb-2 text-sm">
          Отправлено: {task.sent}/{task.total}
        </p>
      ) : null}
      <progress
        className="progress progress-primary mb-3 w-full"
        value={task.done}
        max={Math.max(task.total, 1)}
      />
      {task.status === BookingTaskStatus.error && task.error ? (
        <p className="text-error mb-2 text-sm wrap-break-word">{task.error}</p>
      ) : null}
      {pollError ? (
        <p className="text-error mb-2 text-sm wrap-break-word">{pollError}</p>
      ) : null}
      <ul className="flex max-h-80 flex-col gap-1 overflow-auto">
        {items.map((item) => (
          <li
            key={item.index}
            className={cn(
              "flex items-start gap-2 rounded-md px-1 py-0.5 text-sm wrap-break-word",
              flashIds.has(item.index) &&
                item.status === BookingTaskItemStatus.ok &&
                "bg-success/15",
              flashIds.has(item.index) &&
                item.status === BookingTaskItemStatus.error &&
                "bg-error/15",
              flashIds.has(item.index) &&
                item.status === BookingTaskItemStatus.sent &&
                "bg-info/15",
            )}
          >
            <span
              className={cn(
                "badge badge-sm shrink-0",
                itemBadgeClass(item.status),
              )}
            >
              {itemStatusLabel(item, task.kind)}
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
