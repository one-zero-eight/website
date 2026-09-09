import { $accounts } from "@/api/accounts";
import { navigateToSignIn } from "@/api/accounts/sign-in.tsx";
import { useMyAccessToken } from "@/api/helpers/access-token.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client.ts";
import { $scheduleAssistant } from "@/api/schedule-assistant";
import { useQuery } from "@tanstack/react-query";
import { TimetableViewer } from "./TimetableWorkspace.tsx";
import { publicTimetableConfig } from "./publicTimetableConfig.ts";
import { useMemo } from "react";

const NO_GROUPS: string[] = [];

export function PublicTimetablePage({
  focusMeetingId,
}: {
  focusMeetingId?: string;
}) {
  const timetable = $scheduleAssistant.useQuery("get", "/timetable");
  const { data: me } = $accounts.useQuery("get", "/users/me");
  const [token] = useMyAccessToken();
  const groupsOptions = $scheduleAssistant.queryOptions(
    "get",
    "/me/student-groups",
  );
  const personalGroups = useQuery({
    // Identity is part of the cache key, so changing users never reuses old groups.
    queryKey: ["public-timetable-groups", me?.id ?? null],
    queryFn: (context) =>
      groupsOptions.queryFn({ ...context, queryKey: groupsOptions.queryKey }),
    enabled: !!me && !!token,
    retry: false,
  });
  const config = useMemo(
    () => (timetable.data ? publicTimetableConfig(timetable.data) : null),
    [timetable.data],
  );
  const groups = me && token ? (personalGroups.data ?? NO_GROUPS) : NO_GROUPS;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3 text-sm">
        {!me ? (
          <>
            <span className="text-base-content/65">
              Расписание доступно всем. Войдите, чтобы подсветить свои группы.
            </span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => navigateToSignIn(window.location.href)}
            >
              Войти
            </button>
          </>
        ) : personalGroups.isError ? (
          <>
            <span className="text-error">
              Не удалось загрузить ваши группы:{" "}
              {formatApiErrorMessage(personalGroups.error)}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => void personalGroups.refetch()}
            >
              Повторить
            </button>
          </>
        ) : personalGroups.isPending ? (
          <span className="skeleton h-5 w-52" />
        ) : !groups.length ? (
          <span className="text-base-content/65">
            Ваши группы пока не найдены. Можно просматривать всё расписание.
          </span>
        ) : null}
      </div>
      {timetable.isPending ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton min-h-64 flex-1" />
        </div>
      ) : timetable.isError ? (
        <div className="alert alert-error mx-4 flex flex-wrap gap-2">
          <span>
            Не удалось загрузить расписание:{" "}
            {formatApiErrorMessage(timetable.error)}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void timetable.refetch()}
          >
            Повторить
          </button>
        </div>
      ) : (
        <TimetableViewer
          mode="view"
          config={config!}
          personalGroups={groups}
          focusMeetingId={focusMeetingId}
        />
      )}
    </>
  );
}
