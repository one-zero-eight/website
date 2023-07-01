"use client";
import Calendar from "@/components/Calendar";
import { GroupCard } from "@/components/GroupCard";
import { useUsersGetMe, ViewUser } from "@/lib/events";
import { SCHEDULE_API_URL } from "@/lib/schedule/api";
import Link from "next/link";
import React from "react";

export default function Page() {
  const { data } = useUsersGetMe();

  return (
    <div className="p-4 sm:p-16 flex flex-col">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <div className="my-12 flex flex-row gap-6">
        <div className="w-24 h-24 bg-gray-600 rounded-full"></div>
        <div className="flex flex-col justify-center">
          <p className="text-2xl">
            {data?.name}{" "}
            <span className="text-sm text-gray-400">{data?.status}</span>
          </p>
          <p className="text-lg text-gray-400">{data?.email}</p>
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-8">
        <div className="max-w-[50%]">
          <h2 className="text-3xl font-medium mb-4">Schedule</h2>
          {data?.groups_association === undefined ||
          data.groups_association.length === 0 ? (
            <p className="text-lg text-gray-400">Nothing here</p>
          ) : (
            <div className="flex flex-row flex-wrap gap-2">
              {data.groups_association.map((v) => (
                <GroupCard
                  key={v.group.path}
                  name={v.group.name || ""}
                  group_id={v.group.id}
                />
              ))}
            </div>
          )}
        </div>
        <div className="max-w-[50%]">
          <h2 className="text-3xl font-medium mb-4">Favorites</h2>
          {data?.favorites_association === undefined ||
          data.favorites_association.length === 0 ? (
            <p className="text-lg text-gray-400">
              Add favorite calendars using star button
              <br />
              <Link href="/schedule" className="underline underline-offset-4">
                Explore schedules
              </Link>
            </p>
          ) : (
            <div className="flex flex-row flex-wrap gap-2">
              {data.favorites_association.map((v) => (
                <GroupCard
                  key={v.group.path}
                  name={v.group.name || ""}
                  group_id={v.group.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <h2 className="text-3xl font-medium my-4">Your calendar</h2>
      {!data ? (
        <>Loading...</>
      ) : (
        <Calendar urls={getCalendarsToShow(data)} initialView="dayGridMonth" />
      )}
    </div>
  );
}

function getCalendarsToShow(data: ViewUser, includeHidden: boolean = false) {
  // Extract URLs of all calendars that user has.
  // Handle hidden calendars.
  return ([] as string[]).concat(
    data.groups_association?.flatMap((v) => {
      if (v.hidden && !includeHidden) return [];
      return [`${SCHEDULE_API_URL}/${v.group.path}`];
    }) || [],
    data.favorites_association?.flatMap((v) => {
      if (v.hidden && !includeHidden) return [];
      return [`${SCHEDULE_API_URL}/${v.group.path}`];
    }) || []
  );
}
