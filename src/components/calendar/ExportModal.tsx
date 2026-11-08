import { $schedule } from "@/api/schedule";
import { $search } from "@/api/search";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client.ts";
import {
  getAiCalendarExportLink,
  getMyAssistantCalendarLink,
} from "@/api/search/links.ts";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy.tsx";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getICSLink, getPersonalLink } from "@/api/schedule/links.ts";
import { TargetForExport } from "@/api/schedule/types.ts";

export type ExportTarget =
  | { type: "event-group"; alias: string }
  | { type: "personal"; target: TargetForExport }
  | { type: "ai-calendar" };

export function ExportModal({
  target,
  open,
  onOpenChange,
  aboveModal = false,
}: {
  target: ExportTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aboveModal?: boolean;
}) {
  const { t, i18n } = useLingui();
  const eventGroupAlias = target?.type === "event-group" ? target.alias : null;
  const personalTarget = target?.type === "personal" ? target.target : null;
  const isAiCalendarTarget = target?.type === "ai-calendar";
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");
  const { data: eventGroup } = $schedule.useQuery(
    "get",
    "/event-groups/by-alias",
    {
      params: { query: { alias: eventGroupAlias ?? "" } },
    },
    {
      enabled: eventGroupAlias !== null,
    },
  );

  const { data: scheduleKey } = $schedule.useQuery(
    "post",
    "/users/me/get-schedule-access-key",
    {
      params: {
        query: {
          resource_path: `/users/${scheduleUser?.id}/${personalTarget}.ics`,
        },
      },
    },
    {
      enabled: personalTarget !== null && scheduleUser !== undefined,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const copyButtonRef = useRef(null);

  let calendarURL = "";
  if (eventGroupAlias) {
    calendarURL = getICSLink(eventGroupAlias, scheduleUser?.id, "url");
  }

  if (personalTarget && scheduleKey) {
    calendarURL = getPersonalLink(
      scheduleKey.access_key.resource_path,
      scheduleKey.access_key.access_key,
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        isAiCalendarTarget
          ? t`Export AI Calendar`
          : personalTarget
            ? i18n._(getExportModalText(personalTarget).title)
            : t`Export to your calendar`
      }
      overlayClassName={aboveModal ? "bg-black/50" : ""}
      containerClassName="max-w-full xl:max-w-[75%] bg-base-100"
    >
      {isAiCalendarTarget ? (
        <AiCalendarExport open={open} />
      ) : (
        <>
          <div className="text-base-content/75">
            {personalTarget
              ? i18n._(getExportModalText(personalTarget).description)
              : t`You can add the schedule to your favorite calendar application and it will be updated on schedule changes.`}
          </div>
          <ul className="text-base-content/75 list-decimal pb-4 pl-5">
            <li>
              <Trans>Copy the link.</Trans>
              <ScheduleLinkCopy
                url={calendarURL || ""}
                copyButtonRef={copyButtonRef}
              />
            </li>
            <li>
              <Trans>
                Open your calendar settings to add a calendar by URL.
              </Trans>
              <a
                className="ml-4 flex w-fit flex-row items-center gap-x-2 underline"
                href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                target="_blank"
              >
                <span className="icon-[material-symbols--link] text-base-content/50" />
                <Trans>Google Calendar</Trans>
              </a>
              <a className="ml-4 flex w-fit flex-row items-center gap-x-2">
                <span className="icon-[material-symbols--help-outline] text-base-content/50" />
                <Trans>Other applications: find in settings</Trans>
              </a>
            </li>
            <li>
              <Trans>Paste the link and click Add.</Trans>
            </li>
          </ul>
          <div className="-m-4">
            <Calendar
              urls={
                calendarURL
                  ? [{ url: calendarURL, eventGroup: eventGroup }]
                  : []
              }
              viewStorageId="popup"
            />
          </div>
        </>
      )}
    </Modal>
  );
}

function AiCalendarExport({ open }: { open: boolean }) {
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const [accessKeyOverride, setAccessKeyOverride] = useState<
    string | null | undefined
  >(undefined);
  const requestGeneration = useRef(0);
  const queryClient = useQueryClient();
  const exportKeyQueryOptions = $search.queryOptions(
    "get",
    "/users/my-calendar/export-key",
    undefined,
  );
  const accessKeyQuery = $search.useQuery(
    "get",
    "/users/my-calendar/export-key",
    undefined,
    {
      enabled: open,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );
  const createKey = $search.useMutation(
    "post",
    "/users/my-calendar/export-key",
    {
      retry: false,
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: exportKeyQueryOptions.queryKey,
        }),
    },
  );
  const revokeKey = $search.useMutation(
    "delete",
    "/users/my-calendar/export-key",
    {
      retry: false,
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: exportKeyQueryOptions.queryKey,
        }),
    },
  );

  useEffect(() => {
    requestGeneration.current += 1;
    setAccessKeyOverride(undefined);
    return () => {
      requestGeneration.current += 1;
    };
  }, [open]);

  const accessKey =
    accessKeyOverride === undefined
      ? (accessKeyQuery.data?.access_key ?? null)
      : accessKeyOverride;
  const isLoadingKey = accessKeyQuery.isPending || accessKeyQuery.isFetching;
  const handleCreateKey = () => {
    const currentGeneration = requestGeneration.current;
    createKey.mutate(undefined, {
      onSuccess: (response) => {
        if (requestGeneration.current === currentGeneration) {
          setAccessKeyOverride(response.access_key);
        }
      },
    });
  };
  const handleRevokeKey = () => {
    const currentGeneration = requestGeneration.current;
    revokeKey.mutate(undefined, {
      onSuccess: () => {
        if (requestGeneration.current === currentGeneration) {
          setAccessKeyOverride(null);
        }
      },
    });
  };

  if (isLoadingKey) {
    return <div className="skeleton h-24 w-full" />;
  }

  if (accessKeyQuery.isError) {
    return (
      <div className="space-y-3">
        <p className="text-error">
          {formatApiErrorMessage(accessKeyQuery.error)}
        </p>
        <button
          type="button"
          className="btn btn-outline"
          disabled={accessKeyQuery.isFetching}
          onClick={() => void accessKeyQuery.refetch()}
        >
          <Trans>Retry</Trans>
        </button>
      </div>
    );
  }

  if (!accessKey) {
    return (
      <div className="space-y-3">
        <p className="text-base-content/75">
          <Trans>
            Create a private link to subscribe to AI Calendar events. Creating
            it does not add anything to your calendar.
          </Trans>
        </p>
        {createKey.isError && (
          <p className="text-error">{formatApiErrorMessage(createKey.error)}</p>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={createKey.isPending || revokeKey.isPending}
          onClick={handleCreateKey}
        >
          {createKey.isPending && (
            <span className="loading loading-spinner loading-sm" />
          )}
          <Trans>Create link</Trans>
        </button>
      </div>
    );
  }

  const calendarURL = getAiCalendarExportLink(accessKey);
  return (
    <div className="space-y-4">
      <p className="text-base-content/75">
        <Trans>
          This private link grants read access to your AI Calendar. External
          calendar apps refresh on their own schedule; revoking the link cannot
          erase events already copied by an app. The feed includes only AI
          Calendar events and does not include their source-message provenance.
        </Trans>
      </p>
      <ol className="text-base-content/75 list-decimal space-y-2 pl-5">
        <li>
          <Trans>Copy the private link.</Trans>
          <ScheduleLinkCopy
            url={calendarURL}
            copyButtonRef={copyButtonRef}
            sensitive
            disabled={revokeKey.isPending}
          />
        </li>
        <li>
          <Trans>In your calendar app, add a calendar by URL.</Trans>
          <a
            className="ml-4 flex w-fit flex-row items-center gap-x-2 underline"
            href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
            target="_blank"
          >
            <span className="icon-[material-symbols--link] text-base-content/50" />
            <Trans>Google Calendar</Trans>
          </a>
          <p className="ml-4">
            <Trans>
              For other apps, find the add-by-URL option in settings.
            </Trans>
          </p>
        </li>
        <li>
          <Trans>Paste the link and add it.</Trans>
        </li>
      </ol>
      {revokeKey.isError && (
        <p className="text-error">{formatApiErrorMessage(revokeKey.error)}</p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-outline btn-error"
          disabled={revokeKey.isPending || createKey.isPending}
          onClick={handleRevokeKey}
        >
          {revokeKey.isPending && (
            <span className="loading loading-spinner loading-sm" />
          )}
          <Trans>Revoke link</Trans>
        </button>
      </div>
      <div className="-m-4">
        <Calendar
          urls={[{ url: getMyAssistantCalendarLink() }]}
          viewStorageId="popup"
        />
      </div>
    </div>
  );
}

function getExportModalText(target: TargetForExport) {
  switch (target) {
    case TargetForExport.music_room:
      return {
        title: msg`Export music room bookings`,
        description: msg`You can add your personal music room schedule to your favorite calendar application and it will be updated on changes.`,
      };
    case TargetForExport.sport:
      return {
        title: msg`Export sport trainings`,
        description: msg`You can add your personal sport trainings schedule to your favorite calendar application and it will be updated on changes.`,
      };
    case TargetForExport.moodle:
      return {
        title: msg`Export Moodle deadlines`,
        description: msg`You can add deadlines from your Moodle courses to your favorite calendar application and it will be updated on changes.`,
      };
    case TargetForExport.room_bookings:
      return {
        title: msg`Export room bookings`,
        description: msg`You can add your room bookings to your favorite calendar application and it will be updated on changes.`,
      };
    case TargetForExport.events:
    default:
      return {
        title: msg`Export to your calendar`,
        description: msg`You can add the schedule to your favorite calendar application and it will be updated on schedule changes.`,
      };
  }
}
