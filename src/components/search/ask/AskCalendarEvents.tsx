import { $search, searchTypes } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

// "➕ Add to my calendar" under an answer, as in the Telegram bot: a button for each upcoming event the answer names. The event
// goes to the user's personal calendar, which the calendar page shows (with the events added in the bot)
export function AskCalendarEvents({
  events,
}: {
  events: searchTypes.SchemaCalendarEventOffer[];
}) {
  const { i18n } = useLingui();
  const { showSuccess, showError } = useToast();
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const addEvent = $search.useMutation(
    "post",
    "/users/my-calendar/events/{proposal_id}",
    {
      onSuccess: (_data, { params }) => {
        setAddedIds((prev) => [...prev, params.path.proposal_id]);
        showSuccess(msg`Added to your calendar`);
      },
      onError: (error) => {
        showError(
          msg`Could not add the event to the calendar`,
          formatApiErrorDescriptor(error),
        );
      },
    },
  );

  const formatInterval = (event: searchTypes.SchemaCalendarEventOffer) => {
    const format = (value: string) =>
      new Date(
        event.all_day ? `${value.slice(0, 10)}T12:00:00` : value,
      ).toLocaleString(i18n.locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(event.all_day ? {} : { hour: "2-digit", minute: "2-digit" }),
      });
    const start = format(event.starts_at);
    return !event.all_day && event.ends_at
      ? `${start} – ${format(event.ends_at)}`
      : start;
  };

  return (
    <div className="flex flex-col items-start gap-1">
      {events.map((event) => {
        const isAdded = addedIds.includes(event.id);
        const isAdding =
          addEvent.isPending &&
          addEvent.variables?.params.path.proposal_id === event.id;
        const title = event.title;
        const startsAt = Date.parse(event.starts_at);
        const invalid =
          !Number.isFinite(startsAt) ||
          (event.ends_at != null && !(Date.parse(event.ends_at) > startsAt)) ||
          (event.end_suggested && (!event.ends_at || event.all_day));
        const start = invalid
          ? i18n._(msg`Invalid event interval`)
          : formatInterval(event);
        return (
          <button
            key={event.id}
            type="button"
            className="btn btn-outline btn-sm h-auto min-h-8 py-1 text-left"
            disabled={isAdded || isAdding || invalid}
            onClick={() =>
              addEvent.mutate({ params: { path: { proposal_id: event.id } } })
            }
          >
            {isAdding && (
              <span className="loading loading-spinner loading-sm" />
            )}
            {isAdded ? (
              <Trans>
                ✅ Added: {title} · {start}
              </Trans>
            ) : (
              <Trans>
                ➕ Add to my calendar: {title} · {start}
              </Trans>
            )}
            {!invalid &&
              event.end_suggested &&
              !event.all_day &&
              event.ends_at && (
                <span className="block text-xs">
                  <Trans>
                    Proposed duration: 90 minutes (end time not specified).
                  </Trans>
                </span>
              )}
          </button>
        );
      })}
      {addedIds.length > 0 && (
        <Link to="/calendar" className="text-primary text-sm hover:underline">
          <Trans>Open the calendar</Trans>
        </Link>
      )}
    </div>
  );
}
