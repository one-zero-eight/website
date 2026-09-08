import { useEffect, useMemo, useRef, useState } from "react";
import { $scheduleAssistant } from "@/api/schedule-assistant/index.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  CancelExtraRequestScope,
  ReviewKind,
  type SchemaBookingReview,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { CopyableTextModal } from "@/components/schedule-assistant/CopyableTextModal.tsx";
import { useToast } from "@/components/toast";
import { BookingTree } from "./BookingTree.tsx";
import { BookingStatusLegend } from "./BookingStatusMark.tsx";
import { BookingTaskPanel } from "./BookingTaskPanel.tsx";
import { useBookingTasks } from "./useBookingTasks.ts";
import {
  blockedTaskSlotIds,
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
  slotById,
} from "./bookingModel.ts";

type ConfirmAction = "book" | "cancel-extra";

export function BookingWorkspace() {
  const { showError } = useToast();
  const initializedExpandRef = useRef(false);
  const submissionRef = useRef(false);
  const reviewQuery = $scheduleAssistant.useQuery(
    "get",
    "/bookings/review",
    undefined,
    { refetchOnWindowFocus: false },
  );
  const { data, isPending, isError, error } = reviewQuery;
  const tasks = useBookingTasks();
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
  const blockedIds = useMemo(
    () => blockedTaskSlotIds(tasks.data ?? []),
    [tasks.data],
  );
  // Keep task reservations visible even while the calendar review catches up.
  const selectableReview = useMemo(
    () =>
      data
        ? {
            ...data,
            programs: data.programs.map((program) => ({
              ...program,
              courses: program.courses.map((course) => ({
                ...course,
                components: course.components.map((component) => ({
                  ...component,
                  slots: component.slots.map((slot) =>
                    blockedIds.has(slot.slot_id)
                      ? {
                          ...slot,
                          can_split: false,
                          review_kind:
                            slot.review_kind === ReviewKind.ready ||
                            slot.review_kind === ReviewKind.conflict
                              ? ReviewKind.unknown
                              : slot.review_kind,
                        }
                      : slot,
                  ),
                })),
              })),
            })),
          }
        : undefined,
    [data, blockedIds],
  );

  useEffect(() => {
    if (!data) return;
    const valid = data.programs.flatMap((program) =>
      program.courses.flatMap((course) =>
        course.components.flatMap((component) =>
          component.slots
            .filter(
              (slot) =>
                !blockedIds.has(slot.slot_id) &&
                (isReadySlot(slot) || isSplitSelectableSlot(slot)),
            )
            .map((slot) => slot.slot_id),
        ),
      ),
    );
    setSelectedSlotIds((previous) => pruneSelectedIds(previous, valid));
    setSelectedExtraIds((previous) =>
      pruneSelectedIds(previous, extraIds(data)),
    );
  }, [data, blockedIds]);

  useEffect(() => {
    if (!data || initializedExpandRef.current) return;
    initializedExpandRef.current = true;
    const next = new Set<string>([EXTRA_NODE_ID]);
    for (const program of data.programs) {
      next.add(programNodeId(program.program_id));
      for (const course of program.courses)
        for (const component of course.components)
          next.add(
            componentNodeId(
              program.program_id,
              course.course_id,
              component.component_id,
            ),
          );
    }
    setExpandedIds(next);
  }, [data]);

  const book = $scheduleAssistant.useMutation("post", "/bookings/batch", {
    onSuccess: async (task) => {
      await tasks.handleTaskStarted(task);
      setSelectedSlotIds(new Set());
    },
    onError: async (mutationError) => {
      showError(
        "Ошибка отправки; проверьте сохранённые запросы",
        formatApiErrorMessage(mutationError),
      );
      await tasks.handleRefresh();
    },
    onSettled: () => {
      submissionRef.current = false;
    },
  });
  const cancel = $scheduleAssistant.useMutation(
    "post",
    "/bookings/cancel-extra",
    {
      onSuccess: async (task) => {
        await tasks.handleTaskStarted(task);
        setSelectedExtraIds(new Set());
      },
      onError: async (mutationError) => {
        showError("Ошибка отмены", formatApiErrorMessage(mutationError));
        await tasks.handleRefresh();
      },
      onSettled: () => {
        submissionRef.current = false;
      },
    },
  );

  const busy = book.isPending || cancel.isPending;
  const unsafe =
    busy ||
    tasks.isPending ||
    tasks.isError ||
    reviewQuery.isFetching ||
    tasks.isFetching ||
    tasks.isReconciling;
  const readyIds = useMemo(
    () =>
      data ? collectReadySlotIds(data).filter((id) => !blockedIds.has(id)) : [],
    [data, blockedIds],
  );
  const stats = selectableReview ? countStats(selectableReview) : null;

  function handleToggleSlots(ids: string[], selected: boolean) {
    if (unsafe || !data) return;
    setSelectedSlotIds((previous) => {
      const next = new Set(previous);
      for (const id of ids) {
        const slot = slotById(data, id);
        if (!selected) next.delete(id);
        else if (
          !blockedIds.has(id) &&
          slot &&
          (isReadySlot(slot) || isSplitSelectableSlot(slot))
        )
          next.add(id);
      }
      return next;
    });
  }

  function handleToggleSet(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) {
    setter((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (!data || !confirmAction || unsafe || submissionRef.current) return;
    if (confirmAction === "book") {
      const ids = [...selectedSlotIds].filter((id) => {
        const slot = slotById(data, id);
        return (
          !blockedIds.has(id) &&
          slot &&
          (isReadySlot(slot) || isSplitSelectableSlot(slot))
        );
      });
      if (ids.length === 0 || ids.length !== selectedSlotIds.size) {
        setConfirmAction(null);
        return;
      }
      submissionRef.current = true;
      book.mutate({
        body: {
          slot_ids: ids,
          conflict_modes: buildConflictModes(data, new Set(ids)),
        },
      });
    } else {
      if (!selectedExtraIds.size) return;
      submissionRef.current = true;
      cancel.mutate({
        body: {
          extra_ids: [...selectedExtraIds],
          scope: CancelExtraRequestScope.series,
        },
      });
    }
    setConfirmAction(null);
  }

  if (isPending)
    return (
      <div className="flex w-full flex-col gap-3 p-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  if (isError)
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <h1 className="text-xl font-semibold">Бронирование</h1>
        <p className="text-error">{formatApiErrorMessage(error)}</p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => reviewQuery.refetch()}
        >
          Повторить
        </button>
      </div>
    );

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold">Бронирование</h1>
          <p className="text-base-content/70 text-sm">
            Отправка запроса в Outlook не означает подтверждение. Ожидание
            утверждения — нормальный статус.
          </p>
          {stats ? (
            <BookingStatusLegend
              stats={stats}
              extraCount={data.extra_auto_bookings.length}
            />
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || tasks.isFetching || tasks.isReconciling}
          onClick={() => tasks.handleRefresh()}
        >
          {tasks.isFetching || tasks.isReconciling ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}{" "}
          Перепроверить всё
        </button>
      </div>
      {tasks.isPending ? (
        <div className="flex flex-col gap-2">
          <p>
            Восстанавливаем запросы с сервера. Отправка временно недоступна.
          </p>
          <div className="skeleton h-20 w-full" />
        </div>
      ) : null}
      {tasks.isError ? (
        <div className="border-error rounded-box border p-3 text-sm">
          <p className="text-error">
            Не удалось восстановить запросы:{" "}
            {formatApiErrorMessage(tasks.error)}
          </p>
          <p>Повторная отправка заблокирована до успешной проверки.</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => tasks.refetch()}
          >
            Повторить загрузку
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={unsafe || !readyIds.length}
          onClick={() => handleToggleSlots(readyIds, true)}
        >
          Выбрать все доступные
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || !selectedSlotIds.size}
          onClick={() => setSelectedSlotIds(new Set())}
        >
          Сбросить выбор
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={unsafe || !selectedSlotIds.size}
          onClick={() => setConfirmAction("book")}
        >
          Отправить запросы ({selectedSlotIds.size})
        </button>
        <button
          type="button"
          className="btn btn-warning btn-sm"
          disabled={unsafe || !selectedExtraIds.size}
          onClick={() => setConfirmAction("cancel-extra")}
        >
          Отменить лишние ({selectedExtraIds.size})
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!stats?.conflict}
          onClick={() => setConflictsTextOpen(true)}
        >
          Конфликты текстом
        </button>
      </div>
      {tasks.data?.map((task) => (
        <BookingTaskPanel
          key={task.task_id}
          task={task}
          refreshing={tasks.isReconciling}
          onRefresh={() => tasks.reconcileTask(task.task_id)}
        />
      ))}
      {selectableReview ? (
        <BookingTree
          review={selectableReview}
          expandedIds={expandedIds}
          selectedSlotIds={selectedSlotIds}
          selectedExtraIds={selectedExtraIds}
          expandedConflictIds={expandedConflictIds}
          blockedSlotIds={blockedIds}
          disabled={unsafe}
          onToggleExpanded={(id) => handleToggleSet(setExpandedIds, id)}
          onToggleSlots={handleToggleSlots}
          onToggleExtras={(ids, selected) =>
            setSelectedExtraIds((previous) => {
              const next = new Set(previous);
              for (const id of ids) {
                if (selected) next.add(id);
                else next.delete(id);
              }
              return next;
            })
          }
          onToggleConflictDetails={(id) =>
            handleToggleSet(setExpandedConflictIds, id)
          }
        />
      ) : null}
      <CopyableTextModal
        open={conflictsTextOpen}
        text={formatConflictsText(data)}
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
        disabled={unsafe}
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
  disabled,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  action: ConfirmAction | null;
  review: SchemaBookingReview;
  selectedSlotIds: ReadonlySet<string>;
  selectedExtraIds: ReadonlySet<string>;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const isBook = action === "book";
  const groups = groupSelectedSlotsForConfirm(review, selectedSlotIds);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        isBook
          ? "Отправить запросы в Outlook?"
          : "Отменить лишние бронирования?"
      }
    >
      <p className="text-sm">
        {isBook
          ? `Запросов: ${selectedSlotIds.size}. Комната может потребовать утверждение.`
          : `Отмена целиком: ${selectedExtraIds.size}. Для повторяющейся брони отменяется вся серия, не отдельное занятие.`}
      </p>
      <div className="mt-3 max-h-80 overflow-auto text-sm">
        {isBook
          ? groups.map((course) => (
              <div key={course.courseId} className="mb-2">
                <p className="font-medium">{course.course}</p>
                {course.groups.map((group) => (
                  <div key={group.groupId} className="pl-2">
                    <p>{group.group}</p>
                    <ul>
                      {group.slots.map((slot) => (
                        <li key={slot.id} className="py-1 wrap-break-word">
                          {slot.when}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))
          : review.extra_auto_bookings
              .filter((item) => selectedExtraIds.has(item.extra_id))
              .map((item) => (
                <p key={item.extra_id} className="py-1 wrap-break-word">
                  {item.label}
                </p>
              ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onOpenChange(false)}
        >
          Назад
        </button>
        <button
          type="button"
          className={isBook ? "btn btn-primary" : "btn btn-warning"}
          disabled={disabled}
          onClick={onConfirm}
        >
          {isBook ? "Отправить" : "Отменить целиком"}
        </button>
      </div>
    </Modal>
  );
}
