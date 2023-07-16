"use client";
import { useEventGroupsGetEventGroup } from "@/lib/events";
import React from "react";
import { EventGroupPage } from "@/components/EventGroupPage";

export type Props = {
  params: { groupId: string };
};

export default function Page({ params }: Props) {
  const groupId = Number(params.groupId);
  const { data } = useEventGroupsGetEventGroup(groupId);

  if (!data) {
    return <>Loading...</>;
  }

  return <EventGroupPage data={data} />;
}
