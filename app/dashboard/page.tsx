"use client";
import Calendar from "@/components/Calendar";
import { GroupCard } from "@/components/GroupCard";
import { UserFace } from "@/components/icons/UserFace";
import { Navbar } from "@/components/Navbar";
import ScheduleDialog from "@/components/ScheduleDialog";
import { UserXGroupViewApp, useUsersGetMe } from "@/lib/events";
import { SCHEDULE_API_URL } from "@/lib/schedule/api";
import { ymEvent } from "@/lib/tracking/YandexMetrika";
import Link from "next/link";
import React, { useState } from "react";
import { useWindowSize } from "usehooks-ts";

export default function Page() {
  const { width } = useWindowSize();
  const { data } = useUsersGetMe();
  const [selectedGroupFile, setSelectedGroupFile] = useState("");
  const [dialogOpened, setDialogOpened] = useState(false);
  const favorites = data?.favorites || [];

  return (
    <div className="p-16 flex flex-col">
      <h1 className="text-text-main lg:hidden lg:invisible text-center sm:text-left text-4xl font-bold">
        Dashboard
      </h1>
      <Navbar className="hidden invisible lg:flex lg:visible">
        <h1 className="text-text-main text-center sm:text-left text-4xl font-bold">
          Dashboard
        </h1>
      </Navbar>
      <div className="justify-center sm:justify-normal my-12 flex flex-row gap-6">
        <div className="flex bg-border shrink-0 w-24 h-24 rounded-full justify-center items-center">
          <UserFace className="flex fill-icon-main/50" width={56} height={56} />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-text-main text-2xl">
            {data?.name}{" "}
            <span className="text-sm text-text-secondary/75">
              {data?.status}
            </span>
          </p>
          <p className="text-lg text-text-secondary/75">{data?.email}</p>
        </div>
      </div>
      <div className="flex flex-col xl:flex-row flex-wrap xl:justify-between">
        <div className="min-w-[20%] lg:min-w-[30%] xl:max-w-[45%]">
          <h2 className="text-text-main text-center lg:text-left text-3xl font-medium mb-4">
            Schedule
          </h2>
          {favorites.length === 0 ? (
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
                    onImportClick={() => {
                      ymEvent("button-import", { scheduleFile: v.group.path });
                      setSelectedGroupFile(v.group.path || "");
                      setDialogOpened(true);
                    }}
                  />
                ))}
            </div>
          )}
        </div>
        <div className="min-w-[20%] lg:min-w-[30%] xl:max-w-[50%]">
          <h2 className="text-text-main text-center lg:text-left text-3xl font-medium mb-4">
            Favorites
          </h2>
          {favorites.length === 0 ? (
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
                    onImportClick={() => {
                      ymEvent("button-import", { scheduleFile: v.group.path });
                      setSelectedGroupFile(v.group.path || "");
                      setDialogOpened(true);
                    }}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
      <h2 className="text-text-main text-3xl font-medium my-4">
        Your calendar
      </h2>
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

      <ScheduleDialog
        groupFile={selectedGroupFile}
        opened={dialogOpened}
        close={() => setDialogOpened(false)}
      />
    </div>
  );
}

function getCalendarsToShow(
  favorites: UserXGroupViewApp[],
  includeHidden: boolean = false
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
