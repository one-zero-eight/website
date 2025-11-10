import { $workshops, workshopsTypes } from "@/api/workshops";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { formatDate, formatTime, parseTime } from "./date-utils.ts";
import {
  getInactiveStatusText,
  getSignedPeopleCount,
  isEventRecommended,
  isWorkshopActive,
} from "./event-utils.ts";
import { eventBadges } from "./EventBadges.tsx";
import { LanguageBadge } from "./LanguageBadge.tsx";
import { MAX_CAPACITY } from "./EventCreationModal/DateTimePlaceToggles.tsx";

export interface EventItemProps {
  event: workshopsTypes.SchemaWorkshop;
  edit?: ((workshop: workshopsTypes.SchemaWorkshop) => void) | null;
  className?: string;
}

export function EventItem({ event, edit, className }: EventItemProps) {
  const { data: myCheckins } = $workshops.useQuery("get", "/users/my_checkins");

  const checkedIn = !!myCheckins?.some((w) => w.id === event.id);
  const signedPeople = getSignedPeopleCount(event);

  return (
    <div className="indicator w-full">
      {/* Recommended Badge */}
      {isEventRecommended(event) && (
        <div className="indicator-item translate-x-1/12 -translate-y-1/2">
          {eventBadges["recommended"]}
        </div>
      )}

      {/* Card */}
      <div
        className={clsx(
          "card card-border min-w-full",
          checkedIn && "card-dash border-emerald-700 dark:border-emerald-900",
          !isWorkshopActive(event) &&
            "card-dash border-rose-700 dark:border-rose-950",
          className,
        )}
      >
        <div className="flex items-center justify-between rounded-t-(--radius-box) bg-[url('/pattern.svg')] bg-size-[640px] bg-repeat p-4 pb-20">
          <LanguageBadge event={event} className="inline-flex md:hidden" />
          <div className="flex items-center gap-2">
            {!isWorkshopActive(event) && (
              <div
                className={`badge badge-soft rounded-lg ${!event.is_draft ? "[--badge-color:var(--color-rose-500)]" : "[--badge-color:var(--color-slate-400)]"}`}
              >
                {(event.is_draft && "DRAFT") || getInactiveStatusText(event)}
              </div>
            )}
            {!event.is_draft && !event.is_active && (
              <div
                className={`badge badge-soft "[--badge-color:var(--color-slate-400)]" rounded-lg`}
              >
                Invisible
              </div>
            )}
          </div>
        </div>
        <div className="card-body flex-col justify-between p-4 md:p-6">
          <div className="flex flex-col gap-2">
            <h2 className="card-title">
              <LanguageBadge
                event={event}
                className="hidden self-start md:inline-flex"
              />
              {event.english_name || event.russian_name}
            </h2>
            {event.badges.length !== 0 ? (
              <div className="flex flex-wrap gap-2">
                {event.badges
                  .filter((badge) => !(badge.title == "recommended"))
                  .map((badge) => (
                    <div key={badge.title}>{eventBadges[badge.title]}</div>
                  ))}
              </div>
            ) : null}
          </div>
          <div className="card-actions flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <span className="text-primary icon-[famicons--people] text-xl" />
                <span className="flex items-center text-neutral-400">
                  {event.capacity === MAX_CAPACITY
                    ? signedPeople + "/"
                    : signedPeople + "/" + event.capacity}
                  {event.capacity === MAX_CAPACITY && (
                    <span className="icon-[fa7-solid--infinity]" />
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="icon-[mdi--calendar-outline] text-primary text-xl" />
                <span className="text-neutral-400">
                  {`${formatDate(event.dtstart)} at ${formatTime(parseTime(event.dtstart))}`}
                </span>
              </div>
            </div>
            <div className="flex gap-2 self-end">
              {edit && (
                <button
                  className="btn btn-outline btn-square btn-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    edit(event);
                  }}
                >
                  <span className="icon-[qlementine-icons--pen-12]" />
                </button>
              )}
              <Link
                to="/events/$slug"
                params={{ slug: event.id }}
                className="btn btn-primary btn-soft btn-sm flex items-center gap-1"
              >
                View Event
                <span className="icon-[lucide--move-right] text-xl" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
