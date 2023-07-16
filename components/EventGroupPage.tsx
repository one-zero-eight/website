import { Navbar } from "@/components/Navbar";
import React from "react";
import { ViewEventGroup } from "@/lib/events";

type EventGroupPageProps = {
  data: ViewEventGroup;
};
export function EventGroupPage({ data }: EventGroupPageProps) {
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
