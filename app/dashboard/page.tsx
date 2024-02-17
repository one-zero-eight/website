"use client";
import Calendar from "@/components/common/calendar/Calendar";
import SignInButton from "@/components/common/SignInButton";
import ExportButton from "@/components/schedule/ExportButton";
import { GroupCard } from "@/components/schedule/group-card/GroupCard";
import LinkIconButton from "@/components/schedule/group-card/LinkIconButton";
import { PersonalCard } from "@/components/schedule/group-card/PersonalCard";
import { useMyMusicRoom } from "@/lib/event-group";
import {
  EVENTS_API_URL,
  getICSLink,
  UserXFavoriteGroupView,
  useUsersGetMe,
} from "@/lib/events";
import Link from "next/link";
import React from "react";
import { useIsClient, useWindowSize } from "usehooks-ts";

export default function Page() {
  const { width } = useWindowSize();
  const isClient = useIsClient();
  const { data: user } = useUsersGetMe();
  const favorites = user?.favorites_association || [];
  const { musicRoomSchedule } = useMyMusicRoom();

  if (!isClient) {
    return <></>;
  }

  if (isClient && !user) {
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
      <div className="@container/account my-4 flex max-w-full flex-row gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-border text-icon-main/50 @xl/account:h-24 @xl/account:w-24">
          <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl @xl/account:text-6xl" />
        </div>
        <div className="flex flex-col justify-center overflow-x-hidden">
          <p className="break-words text-2xl">{user?.name}</p>
          <p className="overflow-ellipsis text-text-secondary/75">
            {user?.email}
          </p>
        </div>
      </div>
      <div className="@container/sections flex flex-col justify-between gap-4 @6xl/content:flex-row @6xl/content:gap-8">
        <div className="@container/schedule flex w-full flex-col @6xl/content:w-1/2">
          <h2 className="my-4 text-3xl font-medium">Schedule</h2>
          {favorites.filter((v) => v.predefined === true).length === 0 ? (
            <p className="mb-4 text-lg text-text-secondary/75">Nothing here.</p>
          ) : (
            <div className="grid grid-cols-1 justify-stretch gap-4 @lg/schedule:grid-cols-2 @4xl/schedule:grid-cols-3">
              {favorites
                .filter((v) => v.predefined === true)
                .map((v) => (
                  <GroupCard
                    key={v.event_group.path}
                    group={v.event_group}
                    canHide={true}
                  />
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
        </div>
        <div className="@container/favorites flex w-full flex-col @6xl/content:w-1/2">
          <h2 className="my-4 text-3xl font-medium">Favorites</h2>
          {favorites.filter((v) => v.predefined === false).length === 0 ? (
            <p className="mb-4 text-lg text-text-secondary/75">
              Add favorite calendars using star button.
              <br />
              <Link href="/schedule" className="underline underline-offset-4">
                Explore schedules
              </Link>
            </p>
          ) : (
            <div className="mb-4 grid grid-cols-1 justify-stretch gap-4 @lg/favorites:grid-cols-2 @4xl/favorites:grid-cols-3">
              {favorites
                .filter((v) => v.predefined === false)
                .map((v) => (
                  <GroupCard
                    key={v.event_group.path}
                    group={v.event_group}
                    canHide={true}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
      <h2 className="my-4 text-3xl font-medium">Your calendar</h2>
      <div className="lg:-mx-8"> {/* TODO: -mx-8 makes calendars margin not equal on PC. is it good or not? */}
        {!user ? (
          <>Loading...</>
        ) : (
          <Calendar
            urls={getCalendarsToShow(favorites, false, user.id)}
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
  favorites: UserXFavoriteGroupView[],
  includeHidden: boolean = false,
  userId: number | undefined,
) {
  // Check if there are any groups
  if (favorites.length === 0) {
    return [];
  }

  // Remove hidden calendars
  const toShow = favorites.flatMap((v) => {
    if (v.hidden && !includeHidden) return [];
    return [getICSLink(v.event_group.alias, userId)];
  });

  // Add personal calendars
  toShow.push(`${EVENTS_API_URL}/users/me/music-room.ics`);

  // Return unique items
  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
