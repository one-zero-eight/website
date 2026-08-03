import { useMyAccessToken } from "@/api/helpers/access-token.ts";
import { $scheduleAssistant } from "@/api/schedule-assistant";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { ScheduleConfigStatus } from "@/components/schedule-assistant/config/useConfig.tsx";
import { ChecksSessionProvider } from "@/components/schedule-assistant/checks/checksSession.tsx";
import { MainFloatingMenu } from "@/components/schedule-assistant/MainFloatingMenu.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import type { PropsWithChildren } from "react";

export const Route = createFileRoute("/schedule-assistant")({
  component: RouteComponent,
});

function RequireAccessToken({ children }: PropsWithChildren) {
  const [token] = useMyAccessToken();
  if (!token) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  return children;
}

function ModeratorWall() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <span className="icon-[material-symbols--lock-outline] text-base-content/40 mx-auto mb-4 block text-5xl" />
        <h2 className="mb-2 text-2xl font-medium">Нет доступа</h2>
        <p className="text-base-content/75 text-base">
          Составление расписания доступно только модераторам.
        </p>
      </div>
    </div>
  );
}

function RequireModerator({ children }: PropsWithChildren) {
  const { data, isPending, isError, error } = $scheduleAssistant.useQuery(
    "get",
    "/me",
  );

  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-error text-center">{formatApiErrorMessage(error)}</p>
      </div>
    );
  }

  if (!data.is_moderator) {
    return <ModeratorWall />;
  }

  return children;
}

function Shell({
  children,
  minHDvh = false,
}: PropsWithChildren<{ minHDvh?: boolean }>) {
  return (
    <div
      data-theme="light"
      className={
        minHDvh
          ? "font-rubik flex min-h-dvh w-full flex-col text-base leading-normal antialiased [&_.tab]:select-text [&_button]:select-text [&_summary]:select-text"
          : "font-rubik flex h-screen w-full flex-col text-base leading-normal antialiased [&_.tab]:select-text [&_button]:select-text [&_summary]:select-text"
      }
    >
      <Helmet>
        <title>Составление расписания</title>
        <meta
          name="description"
          content="Составление расписания в Innopolis University."
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      {children}
    </div>
  );
}

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isForInstructors =
    pathname === "/schedule-assistant/for-instructors" ||
    pathname === "/schedule-assistant/for-instructors/";

  if (isForInstructors) {
    return (
      <Shell minHDvh>
        <div className="bg-base-200/40 relative flex min-h-0 flex-1 flex-col overflow-auto">
          <Outlet />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <RequireAuth>
        <RequireAccessToken>
          <RequireModerator>
            <ScheduleConfigStatus>
              <ChecksSessionProvider>
                <div className="bg-base-200/40 relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  <Outlet />
                  <MainFloatingMenu />
                </div>
              </ChecksSessionProvider>
            </ScheduleConfigStatus>
          </RequireModerator>
        </RequireAccessToken>
      </RequireAuth>
    </Shell>
  );
}
