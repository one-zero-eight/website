import { $workshops } from "@/api/workshops";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import {
  formatDate,
  formatTime,
  parseTime,
  getInactiveStatusText,
  getSignedPeopleCount,
  imageLink,
  isEventRecommended,
  isWorkshopActive,
} from "./utils";
import { eventBadges } from "./EventBadges.tsx";
import { LanguageBadge } from "./LanguageBadge.tsx";
import { MAX_CAPACITY } from "./constants.ts";
import { $clubs } from "@/api/clubs/index.ts";
import { CheckInType, HostType } from "@/api/workshops/types.ts";
import { EventItemProps } from "./types";

export function EventItem({
  event,
  isEditable,
  myCheckins: myCheckinsProp,
  clubsList: clubsListProp,
  className,
}: EventItemProps) {
  const { data: myCheckinsData } = $workshops.useQuery(
    "get",
    "/users/my_checkins",
    {
      enabled: !myCheckinsProp,
    },
  );
  const myCheckins = myCheckinsProp ?? myCheckinsData;

  const firstHost = event.host[0];
  const isFirstHostClub =
    firstHost?.host_type === HostType.club || firstHost?.host_type === "club";

  const { data: clubsListData = [], isPending: clubsLoading } = $clubs.useQuery(
    "get",
    "/clubs/",
    { enabled: isFirstHostClub && !clubsListProp },
  );
  const clubsList = clubsListProp ?? clubsListData;

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
        <div
          className={`relative flex ${event.image_file_id ? "h-[220px]" : "h-[110px]"} items-start justify-between rounded-t-(--radius-box) bg-[url("/pattern.svg")] bg-size-[640px] bg-center bg-repeat`}
        >
          {event.image_file_id && (
            <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center">
              <div className="flex h-[180px] w-[180px] items-center justify-center overflow-hidden">
                <img
                  src={imageLink(event.id)}
                  alt={event.english_name + " logo"}
                  className="h-full rounded-lg"
                />
              </div>
            </div>
          )}
          <LanguageBadge
            event={event}
            className="z-10 m-4 inline-flex md:hidden"
          />
          <div className="z-10 m-4 flex items-center gap-2">
            {!isWorkshopActive(event) && (
              <div
                className={`badge badge-soft rounded-lg ${!event.is_draft ? "[--badge-color:var(--color-rose-500)]" : "[--badge-color:var(--color-slate-400)]"}`}
              >
                {(event.is_draft && "DRAFT") || getInactiveStatusText(event)}
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
            {event.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.badges
                  .filter((badge) => badge.title !== "recommended")
                  .map((badge) => (
                    <div key={badge.title}>{eventBadges[badge.title]}</div>
                  ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {event.check_in_type === CheckInType.on_innohassle ? (
              <div className="flex items-center gap-1">
                <span className="text-primary icon-[famicons--people] text-xl" />
                <span className="flex items-center text-neutral-500 dark:text-neutral-200">
                  {event.capacity === MAX_CAPACITY
                    ? signedPeople + "/"
                    : signedPeople + "/" + event.capacity}
                  {event.capacity === MAX_CAPACITY && (
                    <span className="icon-[fa7-solid--infinity]" />
                  )}
                </span>
              </div>
            ) : (
              <>
                {event.place && (
                  <div className="flex items-center gap-1">
                    <span className="text-primary icon-[mdi--map-marker] text-xl" />
                    <span className="flex items-center text-neutral-500 dark:text-neutral-200">
                      {event.place}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center gap-1">
              <span className="icon-[mdi--calendar-outline] text-primary text-xl" />
              <span className="flex items-end gap-1 text-neutral-500 dark:text-neutral-200">
                <span>{formatDate(event.dtstart || "")}</span>
                <span className="text-neutral-400">at</span>
                <span>{formatTime(parseTime(event.dtstart || ""))}</span>
              </span>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex flex-1 items-center gap-1 overflow-hidden text-neutral-500">
              <span className="block">Host:</span>
              <span className="truncate text-neutral-400 dark:text-white">
                {!firstHost ? (
                  "Unknown"
                ) : isFirstHostClub && clubsLoading ? (
                  <span
                    className="bg-base-content/20 inline-block h-4 max-w-28 min-w-20 animate-pulse rounded align-middle"
                    aria-hidden
                  />
                ) : isFirstHostClub ? (
                  (() => {
                    const club = clubsList.find((c) => c.id === firstHost.name);
                    return club ? club.title : firstHost.name;
                  })()
                ) : (
                  firstHost.name || "Unknown"
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isEditable && (
                <Link
                  to="/events/$id/edit"
                  params={{ id: event.id }}
                  className="btn btn-square btn-sm border"
                >
                  <span className="icon-[qlementine-icons--pen-12]" />
                </Link>
              )}
              <Link
                to="/events/$id"
                params={{ id: event.id }}
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
