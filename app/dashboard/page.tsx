"use client";
import Calendar, { URLType } from "@/components/common/calendar/Calendar";
import SignInButton from "@/components/common/SignInButton";
import { GroupCardById } from "@/components/schedule/group-card/GroupCardById";
import LinkIconButton from "@/components/schedule/group-card/LinkIconButton";
import { PersonalCard } from "@/components/schedule/group-card/PersonalCard";
import { useMe } from "@/lib/auth/user";
import {
  events,
  getICSLink,
  getMyMoodleLink,
  getMyMusicRoomLink,
  getMySportLink,
} from "@/lib/events";
import { useMyMusicRoom } from "@/lib/events/event-group";
import Link from "next/link";
import React from "react";
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
      <a
        href="https://t.me/one_zero_eight"
        className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
      >
        <div className="w-12">
          <span className="icon-[ic--baseline-telegram] text-5xl text-[#9747FF]" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold text-text-main">
            Telegram channel
          </p>
          <p className="text-lg text-text-secondary/75">
            Join <span className="text-[#9747FF]">one-zero-eight</span> channel
            in Telegram for all important information about InNoHassle.
          </p>
        </div>
      </a>
      <div className="flex flex-col justify-between gap-4 @container/sections @6xl/content:flex-row @6xl/content:gap-8">
        <details className="flex w-full flex-col @container/schedule @6xl/content:w-1/2">
          <summary className="my-4 text-3xl font-medium">Schedule</summary>
          <div className="grid grid-cols-1 justify-stretch gap-4 @lg/schedule:grid-cols-2 @4xl/schedule:grid-cols-3">
            {predefined?.event_groups.map((v) => (
              <GroupCardById key={v} groupId={v} canHide={true} />
            ))}
            <PersonalCard
              name="Sport"
              description="Your sport schedule"
              pageUrl="/sport"
              buttons={
                <LinkIconButton
                  href="https://t.me/IUSportBot"
                  icon={
                    <span className="icon-[mdi--robot-excited-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
                  }
                  tooltip="Open Telegram bot"
                />
              }
            />
            {musicRoomSchedule.isSuccess && (
              <PersonalCard
                name="Music room"
                description="Your room bookings"
                pageUrl="/music-room"
                buttons={
                  <LinkIconButton
                    href="https://t.me/InnoMusicRoomBot"
                    icon={
                      <span className="icon-[mdi--robot-excited-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
                    }
                    tooltip="Open Telegram bot"
                  />
                }
              />
            )}
            <PersonalCard
              name={
                <span className="flex items-center">
                  Moodle
                  <span className="ml-2 rounded-full bg-focus px-2 py-1 text-xs font-semibold text-white">
                    NEW
                  </span>
                </span>
              }
              description="Your Moodle deadlines"
              buttons={
                <LinkIconButton
                  href="/extension"
                  icon={
                    <span className="icon-[material-symbols--extension-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
                  }
                  tooltip="Install the browser extension to sync Moodle calendar"
                />
              }
            />
          </div>
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
): URLType[] {
  // Remove hidden calendars
  const toShow: URLType[] = favorites.concat(predefined).flatMap((v) => {
    if (!includeHidden && hidden.includes(v)) return [];
    const group = eventGroups.event_groups.find((group) => group.id === v);
    if (!group) return [];
    return [{ url: getICSLink(group.alias, userId), eventGroup: group }];
  });

  // Add personal calendars
  toShow.push({
    url: getMyMusicRoomLink(),
    color: "seagreen",
    sourceLink: "https://t.me/InnoMusicRoomBot",
    updatedAt: new Date().toISOString(),
  });
  toShow.push({
    url: getMySportLink(),
    color: "seagreen",
    sourceLink: "https://sport.innopolis.university",
    updatedAt: new Date().toISOString(),
  });
  toShow.push({
    url: getMyMoodleLink(),
    color: "seagreen",
    sourceLink:
      "https://moodle.innopolis.university/calendar/view.php?view=month",
    updatedAt: new Date().toISOString(),
  });

  // Return unique items
  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
