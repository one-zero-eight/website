"use client";
import Calendar from "@/components/Calendar";
import { EventGroupPage } from "@/components/EventGroupPage";
import { Navbar } from "@/components/Navbar";
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
  if (!group) {
    return <>Loading...</>;
  }
  return (
    <>
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="flex h-64 w-full flex-col items-center bg-primary-main bg-repeat px-4 py-16 lg:px-12 lg:[align-items:normal]"
      >
        <Navbar />
      </div>
      <EventGroupPage groupData={group} isPopup={false} />
      <div className="px-2">
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
        />
      </div>
    </>
  );
}
