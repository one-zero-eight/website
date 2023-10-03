import FavoriteButton from "@/components/FavoriteButton";
import { ViewEventGroup } from "@/lib/events";
import React from "react";

export function EventGroupPage({ group }: { group: ViewEventGroup }) {
  return (
    <>
      <div className="flex flex-col items-center p-16 lg:[align-items:normal]">
        <div className="flex flex-col">
          <div className="flex flex-col justify-between lg:flex-row">
            <div className="flex w-full flex-col lg:flex-row">
              <h1 className="text-center text-3xl font-bold text-text-main lg:text-left lg:text-4xl">
                {group.name}
              </h1>
              <p className="whitespace-pre-wrap text-center text-text-secondary/75 lg:invisible lg:hidden lg:text-left">
                {group.description || ""}
              </p>
            </div>
            <div className="mt-8 flex flex-row items-center justify-center gap-4 lg:flex-row lg:justify-normal lg:[align-items:normal]">
              <FavoriteButton groupId={group.id} />
            </div>
          </div>
          <p className="invisible hidden whitespace-pre-wrap text-center text-text-secondary/75 lg:visible lg:block xl:text-left">
            {group.description || ""}
          </p>
        </div>
        <div className="my-8 flex flex-col items-center justify-center gap-y-4 lg:justify-normal lg:[align-items:normal]">
          <h2 className="flex text-center text-3xl font-medium text-text-main xl:text-left">
            Tags
          </h2>
          <div className="flex gap-2">
            {group.tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex w-fit rounded-2xl bg-secondary-main px-4 py-2"
              >
                <p className="text-text-main">{tag.name}</p>
              </div>
            ))}
          </div>
        </div>
        <h2 className="flex text-center text-3xl font-medium text-text-main xl:text-left">
          Calendar
        </h2>
      </div>
    </>
  );
}
