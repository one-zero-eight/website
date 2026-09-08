import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { $scheduleAssistant } from "@/api/schedule-assistant/index.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  BookingOutcome,
  BookingTaskStatus,
  type SchemaBookingTask,
} from "@/api/schedule-assistant/types.ts";
import { useToast } from "@/components/toast";
import {
  countTaskOutcomes,
  formatTaskOutcomeSummary,
  isActiveTask,
  mergeBookingTasks,
  taskNeedsReconciliation,
} from "./bookingModel.ts";

export const BOOKING_TASKS_QUERY_KEY = [
  "scheduleAssistant",
  "booking-task-history",
] as const;

export function useBookingTasks() {
  const queryClient = useQueryClient();
  const { showError, showSuccess, showWarning, showInfo } = useToast();
  const notified = useRef(new Map<string, string>());
  const started = useRef(new Set<string>());
  const tasksQuery = useQuery({
    queryKey: BOOKING_TASKS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const tasks: SchemaBookingTask[] = [];
      const limit = 100;
      for (let offset = 0; ; offset += limit) {
        signal.throwIfAborted();
        const page = await queryClient.fetchQuery(
          $scheduleAssistant.queryOptions(
            "get",
            "/bookings/tasks",
            { params: { query: { limit, offset } } },
            { staleTime: 0 },
          ),
        );
        tasks.push(...page);
        if (page.length < limit) return tasks;
      }
    },
    refetchInterval: (query) =>
      query.state.data?.some(isActiveTask) ? 2000 : 15000,
    refetchOnWindowFocus: true,
  });

  const reconcile = $scheduleAssistant.useMutation(
    "post",
    "/bookings/tasks/{task_id}/reconcile",
    {
      onSuccess: (task) => {
        queryClient.setQueryData<SchemaBookingTask[]>(
          BOOKING_TASKS_QUERY_KEY,
          (current) => mergeBookingTasks(current ?? [], [task]),
        );
        void queryClient.invalidateQueries({
          queryKey: $scheduleAssistant.queryOptions("get", "/bookings/review")
            .queryKey,
        });
      },
      onError: (error) =>
        showError(
          "Не удалось перепроверить запрос",
          formatApiErrorMessage(error),
        ),
    },
  );

  // Every server change reconciles review, even if its toast was already shown.
  useEffect(() => {
    if (!tasksQuery.data) return;
    void queryClient.invalidateQueries({
      queryKey: $scheduleAssistant.queryOptions("get", "/bookings/review")
        .queryKey,
    });
    for (const task of tasksQuery.data) {
      if (isActiveTask(task) || !started.current.has(task.task_id)) continue;
      const summary = formatTaskOutcomeSummary(task);
      const fingerprint = `${task.status}:${summary}:${task.error}`;
      if (notified.current.get(task.task_id) === fingerprint) continue;
      notified.current.set(task.task_id, fingerprint);
      const counts = countTaskOutcomes(task);
      if (task.status === BookingTaskStatus.error)
        showError("Ошибка операции", task.error ?? summary);
      else if (counts.declined || counts.unknown)
        showWarning("Есть отклонённые или непроверенные запросы", summary);
      else if (
        task.items.length > 0 &&
        task.items.every(
          (item) =>
            item.outcome === BookingOutcome.accepted ||
            item.outcome === BookingOutcome.cancelled,
        )
      )
        showSuccess("Результат подтверждён", summary);
      else showInfo("Отправка завершена, решение комнаты отдельно", summary);
    }
  }, [
    tasksQuery.data,
    queryClient,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  ]);

  async function handleTaskStarted(task: SchemaBookingTask) {
    started.current.add(task.task_id);
    await queryClient.cancelQueries({ queryKey: BOOKING_TASKS_QUERY_KEY });
    queryClient.setQueryData<SchemaBookingTask[]>(
      BOOKING_TASKS_QUERY_KEY,
      (current) => mergeBookingTasks(current ?? [], [task]),
    );
    void queryClient.invalidateQueries({ queryKey: BOOKING_TASKS_QUERY_KEY });
  }

  async function handleRefresh() {
    const result = await tasksQuery.refetch();
    if (result.isError) return;
    await Promise.all(
      (result.data ?? [])
        .filter(taskNeedsReconciliation)
        .map((task) =>
          reconcile
            .mutateAsync({ params: { path: { task_id: task.task_id } } })
            .catch(() => undefined),
        ),
    );
    await queryClient.invalidateQueries({
      queryKey: $scheduleAssistant.queryOptions("get", "/bookings/review")
        .queryKey,
    });
  }

  return {
    ...tasksQuery,
    handleTaskStarted,
    handleRefresh,
    reconcileTask: (taskId: string) =>
      reconcile.mutate({ params: { path: { task_id: taskId } } }),
    isReconciling: reconcile.isPending,
  };
}
