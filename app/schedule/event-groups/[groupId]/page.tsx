"use client";
import { Navbar } from "@/components/Navbar";
import { useEventGroupsGetEventGroup } from "@/lib/events";
import React from "react";

export type Props = {
  params: { groupId: string };
};

export default function Page({ params }: Props) {
  const groupId = Number(params.groupId);
  const { data } = useEventGroupsGetEventGroup(groupId);

  if (!data) {
    return <>Loading...</>;
  }

  return (
    <div className="p-16 items-center lg:[align-items:normal] flex flex-col">
      <h1 className="text-text-main lgw-smh:hidden lgw-smh:invisible text-center xl:text-left text-3xl xl:text-4xl font-bold">
        {data.name}
      </h1>
      <p className="lgw-smh:hidden lgw-smh:invisible text-center xl:text-left text-text-secondary/75">
        {data.satellite?.description || ""}
      </p>
      <Navbar>
        <h1 className="text-text-main text-center lg:text-left text-3xl lg:text-4xl font-bold">
          {data.name}
        </h1>
        <p className="text-center xl:text-left text-text-secondary/75">
          {data.satellite?.description || ""}
        </p>
      </Navbar>
    </div>
  );
}
