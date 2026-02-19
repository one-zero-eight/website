import { Fragment } from "react";
import { $workshops } from "@/api/workshops";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import {
  formatDate,
  formatTime,
  parseTime,
  imageLink,
  isEventRecommended,
} from "./utils";
import { eventBadges } from "./EventBadges.tsx";
import { LanguageBadge } from "./LanguageBadge.tsx";
import { $clubs } from "@/api/clubs/index.ts";
import { EventItemProps } from "./types";
import { HostType } from "@/api/workshops/types.ts";

export function EventItem({
  event,
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

  const firstThreeClubs = event.host.slice(0, 2);

  const { data: clubsListData = [], isPending: clubsLoading } = $clubs.useQuery(
    "get",
    "/clubs/",
    {
      enabled:
        firstThreeClubs.some((h) => h.host_type === HostType.club) &&
        !clubsListProp,
    },
  );
  const clubsList = clubsListProp ?? clubsListData;

  const checkedIn = !!myCheckins?.some((w) => w.id === event.id);

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
        className={clsx("card card-border bg-base-100 min-w-full", className)}
      >
        <div className="relative flex h-[220px] grow items-start justify-between overflow-hidden rounded-t-(--radius-box)">
          <div
            className={clsx(
              "absolute inset-0 bg-[url('/topography.svg')] bg-size-[1200px] bg-center bg-repeat",
              event.image_file_id
                ? "opacity-20 blur-[2px]"
                : "opacity-30 blur-[0px]",
            )}
          />
          {event.image_file_id && (
            <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center select-none">
              <div className="flex h-[160px] items-center justify-center overflow-hidden">
                <img
                  src={imageLink(event.id)}
                  alt={event.english_name + " logo"}
                  className="rounded-field h-full"
                />
              </div>
            </div>
          )}
          <LanguageBadge
            event={event}
            className="z-10 m-4 inline-flex md:hidden"
          />
        </div>
        <div className="card-body flex-col items-start justify-between gap-2 p-4 pt-2 md:p-6 md:pt-4">
          <div className="flex flex-col gap-2">
            <p className="card-title block text-left text-xl">
              <Link
                to={"/events/$id"}
                params={{ id: event.id }}
                className="hover:underline"
              >
                {event.english_name || event.russian_name}
              </Link>
              <LanguageBadge event={event} className="ml-2" />
            </p>
            <div className="flexs flex-col gap-1">
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="icon-[mdi--calendar-outline] text-primary text-xl" />
                  <span className="flex items-end gap-1 text-neutral-500 dark:text-neutral-200">
                    <span>{formatDate(event.dtstart || "")}</span>
                    <span className="text-neutral-400">at</span>
                    <span>{formatTime(parseTime(event.dtstart || ""))}</span>
                  </span>
                </div>
              </div>
              <div className="flex max-w-full items-center justify-between gap-2">
                <span className="flex gap-1 text-neutral-400 dark:text-white">
                  <span className="icon-[sidekickicons--crown-20-solid] text-primary inline-flex shrink-0 self-start text-xl" />
                  <span>
                    {firstThreeClubs.map((host, index) => {
                      const isLast = index === firstThreeClubs.length - 1;
                      const hasExtra = event.host.length > 2 && index === 1;

                      const hostName =
                        host.host_type === HostType.other ? (
                          <span>{host.name || "Unknown"}</span>
                        ) : clubsLoading ? (
                          <span
                            className="bg-base-content/20 inline-block h-4 max-w-28 min-w-20 animate-pulse rounded align-middle"
                            aria-hidden
                          />
                        ) : (
                          <span>
                            {(() => {
                              const club = clubsList.find(
                                (c) => c.id === host.name,
                              );
                              return club ? club.title : host.name;
                            })()}
                          </span>
                        );

                      return (
                        <Fragment key={host.name || index}>
                          {hasExtra ? (
                            <span className="inline-flex items-baseline whitespace-nowrap">
                              {hostName}
                              <span className="badge badge-soft ml-1 inline-flex px-1 align-middle text-xs">
                                +{event.host.length - 2}
                              </span>
                            </span>
                          ) : (
                            hostName
                          )}
                          {!isLast && <span>, </span>}
                        </Fragment>
                      );
                    })}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex w-full items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              {event.is_draft && (
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="icon-[material-symbols--draft-rounded] text-lg" />
                  Draft
                </span>
              )}
              {checkedIn && (
                <span className="flex items-center gap-1 text-green-500">
                  <span className="icon-[lets-icons--check-fill] text-xl" />
                  Checked in
                </span>
              )}
            </div>
            <Link
              to="/events/$id"
              params={{ id: event.id }}
              className="btn btn-primary btn-soft flex items-center gap-1 text-nowrap"
            >
              View Event
              <span className="icon-[lucide--move-right] text-xl" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
