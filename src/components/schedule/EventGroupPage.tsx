import { $schedule } from "@/api/schedule";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { ExportModal } from "@/components/calendar/ExportModal.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import FavoriteButton from "@/components/schedule/group-card/FavoriteButton.tsx";
import { getICSLink } from "@/api/schedule/links.ts";
import { useState } from "react";
import { Helmet } from "@dr.pogodin/react-helmet";
import { useWindowSize } from "usehooks-ts";
import { Link } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";

export function EventGroupPage({ alias }: { alias: string }) {
  const { t } = useLingui();
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");
  const {
    data: group,
    isLoading,
    isError,
    error,
  } = $schedule.useQuery("get", "/event-groups/by-alias", {
    params: { query: { alias } },
  });
  const { width } = useWindowSize();
  const [exportModalOpen, setExportModalOpen] = useState(false);

  if (isLoading) {
    return <Topbar title={<Trans>Group</Trans>} />;
  }

  if (isError || !group) {
    return (
      <>
        <Topbar title={<Trans>Group</Trans>} />
        <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-base-content/75 text-lg">
            <Trans>
              Event group <code className="font-mono">"{alias}"</code> not
              found.
            </Trans>
          </p>
          {isError && error && (
            <p className="text-base-content/60 text-base">
              {formatApiErrorMessage(error)}
            </p>
          )}
          <Link to="/schedule" className="btn btn-primary">
            <Trans>Back to Schedule</Trans>
          </Link>
        </div>
      </>
    );
  }

  const groupName = group.name;

  return (
    <>
      <Helmet>
        <title>{t`${groupName} group — Schedule`}</title>
        <meta name="description" content={group.description ?? undefined} />
      </Helmet>

      <Topbar title={<Trans>Group</Trans>} />
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="bg-base-200 min-h-64 bg-repeat p-4"
      />
      <div className="p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-h-full grow flex-col gap-2">
            <h1 className="text-3xl font-semibold">{group.name}</h1>
            <p className="text-base-content/75 text-base whitespace-pre-wrap">
              {group.description}
            </p>
          </div>
          <FavoriteButton groupAlias={group.alias} />
        </div>
        <h2 className="my-4 flex text-3xl font-medium">
          <Trans>Tags</Trans>
        </h2>
        <div className="flex flex-wrap gap-2">
          {group.tags?.map((tag) => (
            <div
              key={tag.id}
              className="bg-base-300 rounded-box flex w-fit px-4 py-2"
            >
              {tag.name}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-row flex-wrap items-center">
          <h2 className="flex grow text-3xl font-medium">
            <Trans>Calendar</Trans>
          </h2>
          <ExportButton onClick={() => setExportModalOpen(true)} />
        </div>
      </div>
      <Calendar
        urls={[
          {
            url: getICSLink(group.alias, scheduleUser?.id),
            eventGroup: group,
          },
        ]}
        initialView={
          width
            ? width >= 1280
              ? "dayGridMonth"
              : width >= 1024
                ? "timeGridWeek"
                : "listMonth"
            : "dayGridMonth"
        }
        viewStorageId="page"
      />
      <ExportModal
        target={{ type: "event-group", alias: group.alias }}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
