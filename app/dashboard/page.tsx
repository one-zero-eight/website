"use client";
import Calendar from "@/components/Calendar";
import { GroupCard } from "@/components/GroupCard";
import { UserFace } from "@/components/icons/UserFace";
import { Navbar } from "@/components/Navbar";
import { useAuthPaths } from "@/lib/auth";
import { UserXGroupViewApp, useUsersGetMe } from "@/lib/events";
import { SCHEDULE_API_URL } from "@/lib/schedule/api";
import Link from "next/link";
import React from "react";
import { useIsClient, useWindowSize } from "usehooks-ts";

export default function Page() {
  const { width } = useWindowSize();
  const isClient = useIsClient();
  const { data } = useUsersGetMe();
  const favorites = data?.favorites || [];
  const { signIn } = useAuthPaths();

  if (!isClient)
    return (
      <div className="px-4 lg:px-12 py-16 items-center lg:[align-items:normal] flex flex-col">
        <h1 className="text-text-main lgw-smh:hidden lgw-smh:invisible text-center sm:text-left text-3xl sm:text-4xl font-bold">
          Dashboard
        </h1>
        <Navbar>
          <h1 className="text-text-main text-center sm:text-left text-4xl font-bold">
            Dashboard
          </h1>
        </Navbar>
      </div>
    );
  if (isClient && !data) {
    return (
      <>
        <div className="px-4 lg:px-12 py-16 items-center lg:[align-items:normal] flex flex-col">
          <h1 className="text-text-main lgw-smh:hidden lgw-smh:invisible text-center sm:text-left text-3xl sm:text-4xl font-bold">
            Dashboard
          </h1>
          <Navbar>
            <h1 className="text-text-main text-center sm:text-left text-4xl font-bold">
              Dashboard
            </h1>
          </Navbar>
        </div>
        <div className="flex flex-col text-left gap-y-6 mx-16">
          <h1 className="flex text-text-main text-2xl sm:text-3xl font-bold">
            Sign in to get access
          </h1>
          <p className="text-text-secondary/75">
            View your academic groups and save favorite schedule with your
            Innopolis account.
          </p>
          <Link
            href={signIn}
            className="mt-3 flex justify-center items-center w-32 h-12 bg-focus_color text-white rounded-3xl font-semibold text-xl"
          >
            Sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="px-4 lg:px-12 py-16 items-center lg:[align-items:normal] flex flex-col">
        <h1 className="text-text-main lgw-smh:hidden lgw-smh:invisible text-center sm:text-left text-3xl sm:text-4xl font-bold">
          Dashboard
        </h1>
        <Navbar>
          <h1 className="text-text-main text-center sm:text-left text-4xl font-bold">
            Dashboard
          </h1>
        </Navbar>
        <div className="justify-center sm:justify-normal my-12 flex flex-row gap-4 sm:gap-6">
          <div className="flex bg-border shrink-0 w-20 sm:w-24 h-20 sm:h-24 rounded-full justify-center items-center">
            <UserFace
              className="flex fill-icon-main/50"
              width={width >= 640 ? 56 : 48}
              height={width >= 640 ? 56 : 48}
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-text-main text-xl sm:text-2xl">{data?.name}</p>
            <p className="text-base sm:text-lg text-text-secondary/75">
              {data?.email}
            </p>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row flex-wrap xl:justify-between">
          <div className="min-w-[20%] lg:min-w-[30%] xl:max-w-[45%]">
            <h2 className="text-text-main text-center lg:text-left text-3xl font-medium mb-4">
              Schedule
            </h2>
            {favorites.filter((v) => v.predefined === true).length === 0 ? (
              <p className="text-lg text-text-secondary/75">Nothing here</p>
            ) : (
              <div className="justify-center lg:justify-normal flex flex-row flex-wrap gap-4 gap-y-2 mb-4">
                {favorites
                  .filter((v) => v.predefined === true)
                  .map((v) => (
                    <GroupCard
                      key={v.group.path}
                      group={v.group}
                      canHide={true}
                    />
                  ))}
              </div>
            )}
          </div>
          <div className="min-w-[20%] lg:min-w-[30%] xl:max-w-[50%]">
            <h2 className="text-text-main text-center lg:text-left text-3xl font-medium mb-4">
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
              <div className="justify-center lg:justify-normal flex flex-row flex-wrap gap-4 gap-y-2">
                {favorites
                  .filter((v) => v.predefined === false)
                  .map((v) => (
                    <GroupCard
                      key={v.group.path}
                      group={v.group}
                      canHide={true}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
        <h2 className="text-text-main text-3xl font-medium my-4">
          Your calendar
        </h2>
      </div>
      <div className="px-2">
        {!data ? (
          <>Loading...</>
        ) : (
          <Calendar
            urls={getCalendarsToShow(favorites)}
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
  favorites: UserXGroupViewApp[],
  includeHidden: boolean = false,
) {
  // Check if there are any groups
  if (favorites.length === 0) {
    return [];
  }

  // Remove hidden calendars
  const toShow = favorites.flatMap((v) => {
    if (v.hidden && !includeHidden) return [];
    return [`${SCHEDULE_API_URL}/${v.group.path}`];
  });

  // Return unique items
  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
