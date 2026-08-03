import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $scheduleAssistant } from "@/api/schedule-assistant";
import type { SchemaInstructorSlotPreferenceEntry } from "@/api/schedule-assistant/types.ts";
import { InstructorPreferenceGrid } from "@/components/schedule-assistant/settings/instructors/InstructorPreferenceGrid.tsx";
import { useToast } from "@/components/toast";
import { useCallback, useState } from "react";

export function InstructorPreferencesEditor({
  mode,
  token,
}: {
  mode: "me" | "token";
  token?: string;
}) {
  const { showError, showSuccess } = useToast();
  const meQuery = $scheduleAssistant.useQuery(
    "get",
    "/instructor-preferences/me",
    {},
    { enabled: mode === "me" },
  );
  const tokenQuery = $scheduleAssistant.useQuery(
    "get",
    "/instructor-preferences/link/{token}",
    { params: { path: { token: token || "" } } },
    { enabled: mode === "token" && !!token },
  );

  const query = mode === "me" ? meQuery : tokenQuery;
  const { mutate: saveMe, isPending: savingMe } =
    $scheduleAssistant.useMutation("put", "/instructor-preferences/me");
  const { mutate: saveToken, isPending: savingToken } =
    $scheduleAssistant.useMutation(
      "put",
      "/instructor-preferences/link/{token}",
    );
  const isSaving = savingMe || savingToken;
  const [draft, setDraft] = useState<
    SchemaInstructorSlotPreferenceEntry[] | null
  >(null);

  const preferences = draft ?? query.data?.slot_preferences ?? [];

  const handleChange = useCallback(
    (next: SchemaInstructorSlotPreferenceEntry[]) => {
      setDraft(next);
    },
    [],
  );

  function handleSave() {
    if (!query.data) return;
    const body = { slot_preferences: preferences };
    if (mode === "me") {
      saveMe(
        { body },
        {
          onSuccess: (data) => {
            setDraft(null);
            showSuccess("Сохранено", "Предпочтения обновлены.");
            meQuery.refetch();
            void data;
          },
          onError: (error) => {
            showError("Ошибка", formatApiErrorMessage(error));
          },
        },
      );
      return;
    }
    if (!token) return;
    saveToken(
      { params: { path: { token } }, body },
      {
        onSuccess: () => {
          setDraft(null);
          showSuccess("Сохранено", "Предпочтения обновлены.");
          tokenQuery.refetch();
        },
        onError: (error) => {
          showError("Ошибка", formatApiErrorMessage(error));
        },
      },
    );
  }

  if (query.isPending) {
    return <div className="skeleton mx-auto mt-8 h-64 w-full max-w-3xl" />;
  }

  if (query.isError) {
    return (
      <div className="alert alert-error alert-soft mx-auto mt-8 max-w-xl text-sm">
        {formatApiErrorMessage(query.error)}
      </div>
    );
  }

  if (!query.data) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-8 sm:p-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            Предпочтения по времени
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">
            {query.data.instructor_name}
            {query.data.email ? ` · ${query.data.email}` : ""}
          </p>
          <p className="text-base-content/60 mt-2 text-sm">
            Нажмите уровень{" "}
            <span className="text-base-content/80 font-medium">
              Предпочтительно
            </span>
            ,{" "}
            <span className="text-base-content/80 font-medium">
              Нежелательно
            </span>{" "}
            или{" "}
            <span className="text-base-content/80 font-medium">Запрещено</span>{" "}
            и нажмите на ячейки слотов в таблице.
          </p>
        </div>
        <InstructorPreferenceGrid
          term={query.data.term}
          preferences={preferences}
          onChange={handleChange}
        />
      </div>
      <div className="flex justify-stretch sm:justify-end">
        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          disabled={isSaving || draft == null}
          onClick={handleSave}
        >
          {isSaving ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Сохранить"
          )}
        </button>
      </div>
    </div>
  );
}
