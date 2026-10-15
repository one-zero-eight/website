import { $accounts } from "@/api/accounts";
import { navigateToSignIn } from "@/api/accounts/sign-in.tsx";
import { useMyAccessToken } from "@/api/helpers/access-token.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client.ts";
import { $scheduleAssistant } from "@/api/schedule-assistant";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { TimetableViewer } from "./TimetableWorkspace.tsx";
import { publicTimetableConfig } from "./publicTimetableConfig.ts";
import type { PersonalLessonsState } from "./TimetableSidebarMenu.tsx";

const NO_GROUPS: string[] = [];

export function PublicTimetablePage({
  focusMeetingId,
}: {
  focusMeetingId?: string;
}) {
  const timetable = $scheduleAssistant.useQuery("get", "/timetable");
  const { data: me } = $accounts.useQuery("get", "/users/me");
  const [token] = useMyAccessToken();
  const { data: scheduleAssistantMe } = $scheduleAssistant.useQuery(
    "get",
    "/me",
    {},
    { enabled: !!token },
  );
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
  const showComposerLink = !!scheduleAssistantMe?.is_moderator;

  const personalLessons = useMemo((): PersonalLessonsState => {
    if (!me) {
      return {
        kind: "guest",
        onSignIn: () => navigateToSignIn(window.location.href),
      };
    }
    if (personalGroups.isError) {
      return {
        kind: "error",
        message: formatApiErrorMessage(personalGroups.error),
        onRetry: () => void personalGroups.refetch(),
      };
    }
    if (personalGroups.isPending) {
      return { kind: "pending" };
    }
    if (!groups.length) {
      return { kind: "empty" };
    }
    return { kind: "ready" };
  }, [me, personalGroups, groups.length]);

  if (timetable.isPending) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="skeleton h-10 w-full" />
        <div className="skeleton min-h-64 flex-1" />
      </div>
    );
  }

  if (timetable.isError) {
    return (
      <div className="alert alert-error m-4 flex flex-wrap gap-2">
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
    );
  }

  return (
    <TimetableViewer
      mode="view"
      config={config!}
      personalGroups={groups}
      personalLessons={personalLessons}
      sidebarAction={showComposerLink ? "composer" : undefined}
      showDashboardBack
      focusMeetingId={focusMeetingId}
    />
  );
}
