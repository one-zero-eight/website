"use client";
import Calendar from "@/components/common/calendar/Calendar";
import SignInButton from "@/components/common/SignInButton";
import { GroupCardById } from "@/components/schedule/group-card/GroupCardById";
import LinkIconButton from "@/components/schedule/group-card/LinkIconButton";
import { PersonalCard } from "@/components/schedule/group-card/PersonalCard";
import { useMe } from "@/lib/auth/user";
import { events, getICSLink, getMyMusicRoomLink } from "@/lib/events";
import { useMyMusicRoom } from "@/lib/events/event-group";
import Link from "next/link";
import { useIsClient, useWindowSize } from "usehooks-ts";

export default function Page() {
  const { width } = useWindowSize();
  const isClient = useIsClient();
  const { me } = useMe();
  const { data: eventsUser } = events.useUsersGetMe();
  const { data: eventGroups } = events.useEventGroupsListEventGroups();
  const { data: predefined } = events.useUsersGetPredefined();
  const { musicRoomSchedule } = useMyMusicRoom();

  if (!isClient) {
    return <></>;
  }

  if (!me) {
    return (
      <>
        <h2 className="my-4 text-3xl font-medium">Sign in to get access</h2>
        <p className="mb-4 text-lg text-text-secondary/75">
          View your academic groups and save favorite schedule with your
          Innopolis account.
        </p>
        <SignInButton />
      </>
    );
  }

  return (
    <>
      <div className="my-4 flex max-w-full flex-row gap-4 @container/account">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-border text-icon-main/50 @xl/account:h-24 @xl/account:w-24">
          <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl @xl/account:text-6xl" />
        </div>
        <div className="flex flex-col justify-center overflow-x-hidden">
          <p className="break-words text-2xl">{me.innopolis_sso?.name}</p>
          <p className="overflow-ellipsis text-text-secondary/75">
            {me.innopolis_sso?.email}
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4 @container/sections @6xl/content:flex-row @6xl/content:gap-8">
        <details className="flex w-full flex-col @container/schedule @6xl/content:w-1/2">
          <summary className="my-4 text-3xl font-medium">Schedule</summary>
          {predefined?.event_groups === undefined ||
          predefined.event_groups.length === 0 ? (
            <p className="mb-4 text-lg text-text-secondary/75">Nothing here.</p>
          ) : (
            <div className="grid grid-cols-1 justify-stretch gap-4 @lg/schedule:grid-cols-2 @4xl/schedule:grid-cols-3">
              {predefined.event_groups.map((v) => (
                <GroupCardById key={v} groupId={v} canHide={true} />
              ))}
              {musicRoomSchedule.isSuccess && (
                <PersonalCard
                  name="Music room"
                  description="Your room bookings"
                  pageUrl="/music-room"
                  buttons={
                    <LinkIconButton
                      href="https://t.me/InnoMusicRoomBot"
                      icon={
                        <span className="icon-[mdi--robot-excited-outline] text-[#78DBE2]" />
                      }
                      tooltip="Open Telegram bot"
                    />
                  }
                />
              )}
            </div>
          )}
        </details>
        <details className="flex w-full flex-col @container/favorites @6xl/content:w-1/2">
          <summary className="my-4 text-3xl font-medium">Favorites</summary>
          {eventsUser?.favorite_event_groups === undefined ||
          eventsUser.favorite_event_groups.length === 0 ? (
            <p className="mb-4 text-lg text-text-secondary/75">
              Add favorite calendars using star button.
              <br />
              <Link href="/schedule" className="underline underline-offset-4">
                Explore schedules
              </Link>
            </p>
          ) : (
            <div className="mb-4 grid grid-cols-1 justify-stretch gap-4 @lg/favorites:grid-cols-2 @4xl/favorites:grid-cols-3">
              {eventsUser.favorite_event_groups.map((v) => (
                <GroupCardById key={v} groupId={v} canHide={true} />
              ))}
            </div>
          )}
        </details>
      </div>
      <h2 className="my-4 text-3xl font-medium">Your calendar</h2>
      <div className="@lg/content:-mx-8 @lg/content:-mb-8">
        {eventsUser?.favorite_event_groups === undefined ||
        eventsUser?.hidden_event_groups === undefined ||
        predefined?.event_groups === undefined ||
        eventGroups === undefined ? (
          <>Loading...</>
        ) : (
          <Calendar
            urls={getCalendarsToShow(
              eventsUser.favorite_event_groups,
              eventsUser.hidden_event_groups,
              predefined.event_groups,
              eventGroups,
              false,
              eventsUser.id,
            )}
            initialView={
              width
                ? width >= 1280
                  ? "dayGridMonth"
                  : width >= 1024
                    ? "timeGridWeek"
                    : "listMonth"
                : "dayGridMonth"
            }
            viewId="page"
          />
        )}
      </div>
    </>
  );
}

function getCalendarsToShow(
  favorites: number[],
  hidden: number[],
  predefined: number[],
  eventGroups: events.ListEventGroupsResponseOutput,
  includeHidden: boolean = false,
  userId: number | undefined,
) {
  // Remove hidden calendars
  const toShow = favorites.concat(predefined).flatMap((v) => {
    if (!includeHidden && hidden.includes(v)) return [];
    const group = eventGroups.groups.find((group) => group.id === v);
    if (!group) return [];
    return [getICSLink(group.alias, userId)];
  });

  // Add personal calendars
  toShow.push(getMyMusicRoomLink());

  // Return unique items
  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
