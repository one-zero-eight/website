"use client";
import { useEventGroupsGetEventGroup } from "@/lib/events";
import React from "react";
import { EventGroupPage } from "@/components/EventGroupPage";
import { Navbar } from "@/components/Navbar";
import { SCHEDULE_API_URL } from "@/lib/schedule/api";
import Calendar from "@/components/Calendar";
import { useWindowSize } from "usehooks-ts";

export type Props = {
  params: { groupId: string };
};

export default function Page({ params }: Props) {
  const groupId = Number(params.groupId);
  const { data } = useEventGroupsGetEventGroup(groupId);
  const { width } = useWindowSize();
  if (!data) {
    return <>Loading...</>;
  }
  return (
    <>
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="p-16 bg-repeat bg-primary-main w-full h-64 items-center lg:[align-items:normal] flex flex-col"
      >
        <Navbar />
      </div>
      <EventGroupPage groupData={data} isPopup={false} />
      <div className="px-2">
        <Calendar
          urls={data.path ? [`${SCHEDULE_API_URL}/${data.path}`] : []}
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
