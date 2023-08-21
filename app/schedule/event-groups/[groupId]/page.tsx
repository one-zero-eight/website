"use client";
import Calendar from "@/components/Calendar";
import { EventGroupPage } from "@/components/EventGroupPage";
import { Navbar } from "@/components/Navbar";
import {
  getICSLink,
  useEventGroupsGetEventGroup,
  useUsersGetMe,
} from "@/lib/events";
import React from "react";
import { useWindowSize } from "usehooks-ts";

export type Props = {
  params: { groupId: string };
};

export default function Page({ params }: Props) {
  const groupId = Number(params.groupId);
  const { data: user } = useUsersGetMe();
  const { data: group } = useEventGroupsGetEventGroup(groupId);
  const { width } = useWindowSize();
  if (!group) {
    return <>Loading...</>;
  }
  return (
    <>
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="px-4 lg:px-12 py-16 bg-repeat bg-primary-main w-full h-64 items-center lg:[align-items:normal] flex flex-col"
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
