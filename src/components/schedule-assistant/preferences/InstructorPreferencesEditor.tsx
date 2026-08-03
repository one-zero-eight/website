import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $scheduleAssistant } from "@/api/schedule-assistant";
import type { SchemaInstructorSlotPreferenceEntry } from "@/api/schedule-assistant/types.ts";
import { InstructorPreferenceGrid } from "@/components/schedule-assistant/settings/instructors/InstructorPreferenceGrid.tsx";
import {
  PREFERENCES_COPY,
  readStoredPreferencesLocale,
  storePreferencesLocale,
  type PreferencesLocale,
} from "@/components/schedule-assistant/preferences/preferencesI18n.ts";
import { cn } from "@/lib/ui/cn";
import { Helmet } from "@dr.pogodin/react-helmet";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export function InstructorPreferencesEditor({
  mode,
  token,
}: {
  mode: "me" | "token";
  token?: string;
}) {
  const queryClient = useQueryClient();
  const [locale, setLocale] = useState<PreferencesLocale>(() =>
    readStoredPreferencesLocale(),
  );
  const copy = PREFERENCES_COPY[locale];

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
  const [saveError, setSaveError] = useState<string | null>(null);

  const preferences = draft ?? query.data?.slot_preferences ?? [];

  const handleChange = useCallback(
    (next: SchemaInstructorSlotPreferenceEntry[]) => {
      setDraft(next);
      setSaveError(null);
    },
    [],
  );

  function handleLocaleChange(next: PreferencesLocale) {
    setLocale(next);
    storePreferencesLocale(next);
  }

  function handleSave() {
    if (!query.data) return;
    const body = { slot_preferences: preferences };
    setSaveError(null);

    if (mode === "me") {
      saveMe(
        { body },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(
              $scheduleAssistant.queryOptions(
                "get",
                "/instructor-preferences/me",
              ).queryKey,
              data,
            );
            setDraft(null);
          },
          onError: (error) => {
            setSaveError(formatApiErrorMessage(error));
          },
        },
      );
      return;
    }
    if (!token) return;
    saveToken(
      { params: { path: { token } }, body },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(
            $scheduleAssistant.queryOptions(
              "get",
              "/instructor-preferences/link/{token}",
              { params: { path: { token } } },
            ).queryKey,
            data,
          );
          setDraft(null);
        },
        onError: (error) => {
          setSaveError(formatApiErrorMessage(error));
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
      <Helmet>
        <title>{copy.title}</title>
      </Helmet>
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold sm:text-2xl">{copy.title}</h1>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className={cn(
                  "rounded-field flex h-8 w-8 items-center justify-center border",
                  locale === "ru"
                    ? "border-base-content/30 bg-base-200"
                    : "border-base-300 bg-base-100 opacity-70 hover:opacity-100",
                )}
                title="Русский"
                onClick={() => handleLocaleChange("ru")}
              >
                <span className="icon-[circle-flags--ru] text-lg" />
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-field flex h-8 w-8 items-center justify-center border",
                  locale === "en"
                    ? "border-base-content/30 bg-base-200"
                    : "border-base-300 bg-base-100 opacity-70 hover:opacity-100",
                )}
                title="English"
                onClick={() => handleLocaleChange("en")}
              >
                <span className="icon-[circle-flags--gb] text-lg" />
              </button>
            </div>
          </div>
          <p className="text-base-content/70 mt-1 text-sm">
            {query.data.instructor_name}
            {query.data.email ? ` · ${query.data.email}` : ""}
          </p>
          <p className="text-base-content/60 mt-2 text-sm">
            {copy.instruction}
          </p>
        </div>
        <InstructorPreferenceGrid
          term={query.data.term}
          preferences={preferences}
          onChange={handleChange}
          locale={locale}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:items-end">
        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          disabled={isSaving || draft == null}
          onClick={handleSave}
        >
          {isSaving ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            copy.save
          )}
        </button>
        {saveError ? (
          <p className="text-error text-xs sm:text-right">{saveError}</p>
        ) : null}
      </div>
    </div>
  );
}
