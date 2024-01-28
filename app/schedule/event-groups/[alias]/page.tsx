"use client";
import Calendar from "@/components/common/calendar/Calendar";
import ExportButton from "@/components/schedule/ExportButton";
import FavoriteButton from "@/components/schedule/group-card/FavoriteButton";
import { NavbarTemplate } from "@/components/layout/Navbar";
import {
  getICSLink,
  useEventGroupsFindEventGroupByAlias,
  useUsersGetMe,
} from "@/lib/events";
import React from "react";
import { useWindowSize } from "usehooks-ts";

export type Props = {
  params: { alias: string };
};

export default function Page({ params: { alias } }: Props) {
  const { data: user } = useUsersGetMe();
  const { data: group } = useEventGroupsFindEventGroupByAlias({ alias });
  const { width } = useWindowSize();

  return (
    <>
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="h-64 bg-primary-main bg-repeat p-4 lg:p-12"
      >
        <NavbarTemplate title="" description="" />
      </div>
      {group && (
        <div className="flex flex-col p-4 lg:p-12">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-h-full flex-grow">
              <h1 className="text-3xl font-semibold">{group.name}</h1>
              <p className="mt-2 whitespace-pre-wrap text-base text-text-secondary/75">
                {group.description ||
                  "Hello world, this is a long description about my life and this elective."}
              </p>
            </div>
            <FavoriteButton groupId={group.id} />
          </div>
          <h2 className="my-4 flex text-3xl font-medium">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {group.tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex w-fit rounded-2xl bg-secondary-main px-4 py-2"
              >
                {tag.name}
              </div>
            ))}
          </div>
          <div className="my-4 flex flex-row flex-wrap items-center">
            <h2 className="flex grow text-3xl font-medium">Calendar</h2>
            <ExportButton alias={group.alias} />
          </div>
          <div className="-mx-4 -mb-4 lg:-mx-8 lg:-mb-8">
            <Calendar
              urls={[getICSLink(group.alias, user?.id)]}
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
          </div>
        </div>
      )}
    </>
  );
}
