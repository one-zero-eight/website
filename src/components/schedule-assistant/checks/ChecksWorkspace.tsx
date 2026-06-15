import { $scheduleAssistant } from "@/api/schedule-assistant/index.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { CheckOptionsPanel } from "@/components/schedule-assistant/checks/CheckOptionsPanel.tsx";
import { useChecksSession } from "@/components/schedule-assistant/checks/checksSession.tsx";
import { IssuesResults } from "@/components/schedule-assistant/checks/IssuesResults.tsx";
import { useToast } from "@/components/toast";

export function ChecksWorkspace() {
  const { showError } = useToast();
  const {
    checkParameters,
    setCheckParameters,
    issues,
    hasRun,
    saveCheckResults,
  } = useChecksSession();

  const { mutate, isPending } = $scheduleAssistant.useMutation(
    "post",
    "/issues/check",
    {
      onSuccess: (data) => {
        saveCheckResults(data.issues);
      },
      onError: (error) => {
        showError("Ошибка проверки", formatApiErrorMessage(error));
      },
    },
  );

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold">Проверка расписания</h1>
          {hasRun ? (
            <p className="text-base-content/70 text-sm">
              {issues.length === 0
                ? "Проблем не найдено"
                : `Найдено проблем: ${issues.length}`}
            </p>
          ) : (
            <p className="text-base-content/70 text-sm">
              Проверка выполняется по сохранённому конфигу семестра.
            </p>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={isPending}
          onClick={() => mutate({ body: checkParameters })}
        >
          {isPending ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <span className="icon-[material-symbols--fact-check-outline] text-lg" />
          )}
          Запустить проверку
        </button>
      </div>

      <CheckOptionsPanel
        value={checkParameters}
        onChange={setCheckParameters}
        disabled={isPending}
      />

      <IssuesResults issues={issues} hasRun={hasRun} />
    </div>
  );
}
