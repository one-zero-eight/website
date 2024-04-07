"use client";
import Calendar from "@/components/common/calendar/Calendar";
import { NavbarTemplate } from "@/components/layout/Navbar";
import { getMySportLink } from "@/lib/events";
import React from "react";

export default function Page() {
  return (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <NavbarTemplate
        title="Sport"
        description="Check in for sports in the new Sport bot."
      />
      <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <div className="flex flex-col gap-4">
          <a
            href="https://t.me/IUSportBot"
            className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
          >
            <div className="w-12">
              <span className="icon-[mdi--robot-excited-outline] text-5xl text-[#9747FF]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="flex items-center text-2xl font-semibold text-text-main underline-offset-4 group-hover:underline">
                Telegram bot
                <span className="ml-2 rounded-full bg-focus px-2 py-1 text-xs font-semibold text-white">
                  NEW
                </span>
              </p>
              <p className="text-lg text-text-secondary/75">
                Use the new Telegram bot to check in for sports.
              </p>
            </div>
          </a>
        </div>
        <div className="flex flex-col gap-4">
          <a
            href="https://sport.innopolis.university"
            className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
          >
            <div className="w-12">
              <span className="icon-[material-symbols--quick-reference-outline-rounded] text-5xl text-[#9747FF]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-2xl font-semibold text-text-main underline-offset-4 group-hover:underline">
                Official website
              </p>
              <p className="text-lg text-text-secondary/75">
                Check out the official website for more information about
                sports.
              </p>
            </div>
          </a>
        </div>
      </div>
      <h2 className="my-4 text-3xl font-medium">Sport calendar</h2>
      <div className="@2xl/content:-mx-8">
        <Calendar
          urls={[
            {
              url: getMySportLink(),
              color: "seagreen",
            },
          ]}
          initialView="timeGridWeek"
          viewId="music-room"
        />
      </div>
    </div>
  );
}
