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

  const formatStart = (event: searchTypes.SchemaCalendarEventOffer) =>
    new Date(event.starts_at).toLocaleString(i18n.locale, {
      day: "numeric",
      month: "short",
      ...(event.all_day ? {} : { hour: "2-digit", minute: "2-digit" }),
    });

  return (
    <div className="flex flex-col items-start gap-1">
      {events.map((event) => {
        const isAdded = addedIds.includes(event.id);
        const isAdding =
          addEvent.isPending &&
          addEvent.variables?.params.path.proposal_id === event.id;
        const title = event.title;
        const start = formatStart(event);
        return (
          <button
            key={event.id}
            type="button"
            className="btn btn-outline btn-sm h-auto min-h-8 py-1 text-left"
            disabled={isAdded || isAdding}
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
