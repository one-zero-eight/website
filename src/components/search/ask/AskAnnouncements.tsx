import {
  formatApiErrorDescriptor,
  formatApiErrorMessage,
} from "@/api/helpers/create-query-client";
import { $search, searchTypes } from "@/api/search";
import { CatIcon } from "@/components/icons/CatIcon";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  unreadCount,
  useAnnouncements,
  useAnnouncementsSeen,
} from "./ask-announcements";
import { formatEventInterval } from "./calendar-interval";

const MAX_BADGE = 99;

const KIND_LABELS = {
  reschedule: msg`Reschedule`,
  room_change: msg`Room change`,
  cancel: msg`Cancellation`,
  announcement: msg`Announcement`,
} satisfies Record<searchTypes.SchemaAnnouncement["kind"], unknown>;

// The pinned first row of the chat list: the read-only chat of the changes found in the user's study chats
export function AskAnnouncementsItem({
  isOpen,
  onOpen,
}: {
  isOpen: boolean;
  onOpen: () => void;
}) {
  const { data } = useAnnouncements();
  const [seenId] = useAnnouncementsSeen();
  const unread = unreadCount(data, seenId);

  return (
    <div
      className={cn(
        "group rounded-field hover:bg-base-200 flex items-center",
        isOpen && "bg-base-200 font-medium",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 grow items-center gap-2 px-3 py-1.5 text-left text-sm"
        onClick={onOpen}
      >
        <span className="icon-[material-symbols--campaign-outline-rounded] shrink-0 text-lg" />
        <span className="truncate">
          <Trans>Announcements</Trans>
        </span>
      </button>
      {!isOpen && unread > 0 && (
        <span className="badge badge-primary badge-sm mr-2">
          {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
        </span>
      )}
    </div>
  );
}

// The conversation of the announcements: the bot's messages only, there is no message box
export function AskAnnouncements() {
  const { data, isPending, error, refetch, isFetching } = useAnnouncements();
  const [seenId, setSeenId] = useAnnouncementsSeen();
  const endRef = useRef<HTMLDivElement>(null);
  const count = data?.length ?? 0;

  useEffect(() => {
    if (!data || data.length === 0) return;
    const newest = Math.max(...data.map((item) => item.id));
    if (newest > seenId) setSeenId(newest);
  }, [data, seenId, setSeenId]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [count]);

  return (
    <div className="flex min-h-0 grow flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl grow flex-col gap-4 p-4">
        {isPending && !error && (
          <>
            <div className="skeleton h-10 w-1/2" />
            <div className="skeleton h-24 w-3/4" />
          </>
        )}
        {error && (
          <div className="border-base-300 bg-base-200 text-base-content rounded-field flex flex-col gap-1 self-start border! px-4 py-2">
            <span>{formatApiErrorMessage(error)}</span>
            <button
              type="button"
              className="btn btn-sm self-start"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <Trans>Retry</Trans>
            </button>
          </div>
        )}
        {data && data.length === 0 && (
          <div className="text-base-content/60 flex grow items-center justify-center text-center">
            <Trans>
              No announcements yet. Reschedules, room changes, cancellations and
              new events found in your study chats will appear here.
            </Trans>
          </div>
        )}
        {data?.map((item) => (
          <AnnouncementCard key={item.id} item={item} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function AnnouncementCard({ item }: { item: searchTypes.SchemaAnnouncement }) {
  const { i18n } = useLingui();
  const { showError } = useToast();
  const [applied, setApplied] =
    useState<searchTypes.SchemaAddedAnnouncement | null>(null);

  const apply = $search.useMutation(
    "post",
    "/announcements/{change_id}/calendar",
    {
      onSuccess: setApplied,
      onError: (error) => {
        showError(
          msg`Could not update the calendar`,
          formatApiErrorDescriptor(error),
        );
      },
    },
  );

  const room = item.room;
  const title = applied?.title ?? "";
  const { source } = item;
  const sentAt = new Date(source.sent_at).toLocaleString(i18n.locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex max-w-full min-w-0 items-end gap-2 self-start">
      <CatIcon />
      <div className="border-base-300 bg-base-200 text-base-content rounded-field flex min-w-0 flex-col gap-1 border! px-4 py-2 wrap-anywhere">
        <span className="font-bold">
          {i18n._(KIND_LABELS[item.kind])}: {item.subject ?? item.summary}
        </span>
        <span>{formatEventInterval(item, i18n.locale)}</span>
        {item.end_suggested && !item.all_day && item.ends_at && (
          <span className="text-sm">
            <Trans>
              Proposed duration: 90 minutes (end time not specified).
            </Trans>
          </span>
        )}
        {room && (
          <span>
            <Trans>Room: {room}</Trans>
          </span>
        )}
        {item.subject && <span>{item.summary}</span>}
        <span className="text-base-content/60 text-sm">
          {source.link ? (
            <a
              href={source.link}
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              {source.chat_title}
            </a>
          ) : (
            source.chat_title
          )}
          {source.sender_name && ` · ${source.sender_name}`}
          {` · ${sentAt}`}
        </span>
        <details className="text-sm">
          <summary className="cursor-pointer">
            <Trans>Message</Trans>
          </summary>
          <p className="whitespace-pre-wrap">{source.text}</p>
        </details>
        {applied ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {applied.action === "added" && (
                <Trans>✅ Added to your calendar: {title}</Trans>
              )}
              {applied.action === "moved" && (
                <Trans>✅ Moved in your calendar: {title}</Trans>
              )}
              {applied.action === "room_changed" && (
                <Trans>✅ Room changed in your calendar: {title}</Trans>
              )}
              {applied.action === "removed" && (
                <Trans>✅ Removed from your calendar: {title}</Trans>
              )}
            </span>
            <Link
              to="/calendar"
              className="text-primary text-sm hover:underline"
            >
              <Trans>Open the calendar</Trans>
            </Link>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-outline btn-sm self-start"
            disabled={apply.isPending}
            onClick={() =>
              apply.mutate({ params: { path: { change_id: item.id } } })
            }
          >
            {apply.isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            {item.kind === "announcement" ? (
              <Trans>➕ Add to my calendar</Trans>
            ) : (
              <Trans>✏️ Apply to my calendar</Trans>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
