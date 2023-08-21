"use client";
import Calendar from "@/components/Calendar";
import { GroupCard } from "@/components/GroupCard";
import { UserFace } from "@/components/icons/UserFace";
import { Navbar } from "@/components/Navbar";
import { useAuthPaths } from "@/lib/auth";
import {
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
  const { signIn } = useAuthPaths();

  if (!isClient)
    return (
      <div className="flex flex-col items-center px-4 py-16 lg:px-12 lg:[align-items:normal]">
        <h1 className="text-center text-3xl font-bold text-text-main sm:text-left sm:text-4xl lgw-smh:invisible lgw-smh:hidden">
          Dashboard
        </h1>
        <Navbar>
          <h1 className="text-center text-4xl font-bold text-text-main sm:text-left">
            Dashboard
          </h1>
        </Navbar>
      </div>
    );
  if (isClient && !user) {
    return (
      <>
        <div className="flex flex-col items-center px-4 py-16 lg:px-12 lg:[align-items:normal]">
          <h1 className="text-center text-3xl font-bold text-text-main sm:text-left sm:text-4xl lgw-smh:invisible lgw-smh:hidden">
            Dashboard
          </h1>
          <Navbar>
            <h1 className="text-center text-4xl font-bold text-text-main sm:text-left">
              Dashboard
            </h1>
          </Navbar>
        </div>
        <div className="mx-16 flex flex-col gap-y-6 text-left">
          <h1 className="flex text-2xl font-bold text-text-main sm:text-3xl">
            Sign in to get access
          </h1>
          <p className="text-text-secondary/75">
            View your academic groups and save favorite schedule with your
            Innopolis account.
          </p>
          <Link
            href={signIn}
            className="mt-3 flex h-12 w-32 items-center justify-center rounded-3xl bg-focus_color text-xl font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center px-4 py-16 lg:px-12 lg:[align-items:normal]">
        <h1 className="text-center text-3xl font-bold text-text-main sm:text-left sm:text-4xl lgw-smh:invisible lgw-smh:hidden">
          Dashboard
        </h1>
        <Navbar>
          <h1 className="text-center text-4xl font-bold text-text-main sm:text-left">
            Dashboard
          </h1>
        </Navbar>
        <div className="my-12 flex flex-row justify-center gap-4 sm:justify-normal sm:gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-border sm:h-24 sm:w-24">
            <UserFace
              className="flex fill-icon-main/50"
              width={width >= 640 ? 56 : 48}
              height={width >= 640 ? 56 : 48}
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xl text-text-main sm:text-2xl">{user?.name}</p>
            <p className="text-base text-text-secondary/75 sm:text-lg">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex flex-col flex-wrap xl:flex-row xl:justify-between">
          <div className="min-w-[20%] lg:min-w-[30%] xl:max-w-[45%]">
            <h2 className="mb-4 text-center text-3xl font-medium text-text-main lg:text-left">
              Schedule
            </h2>
            {favorites.filter((v) => v.predefined === true).length === 0 ? (
              <p className="text-lg text-text-secondary/75">Nothing here</p>
            ) : (
              <div className="mb-4 flex flex-row flex-wrap justify-center gap-4 gap-y-2 lg:justify-normal">
                {favorites
                  .filter((v) => v.predefined === true)
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
          <div className="min-w-[20%] lg:min-w-[30%] xl:max-w-[50%]">
            <h2 className="mb-4 text-center text-3xl font-medium text-text-main lg:text-left">
              Favorites
            </h2>
            {favorites.filter((v) => v.predefined === false).length === 0 ? (
              <p className="text-lg text-text-secondary/75">
                Add favorite calendars using star button
                <br />
                <Link href="/schedule" className="underline underline-offset-4">
                  Explore schedules
                </Link>
              </p>
            ) : (
              <div className="flex flex-row flex-wrap justify-center gap-4 gap-y-2 lg:justify-normal">
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
        <h2 className="my-4 text-3xl font-medium text-text-main">
          Your calendar
        </h2>
      </div>
      <div className="px-2">
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

  // Return unique items
  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
