"use client";
import Calendar from "@/components/Calendar";
import CloseIcon from "@/components/icons/CloseIcon";
import LinkIcon from "@/components/icons/LinkIcon";
import QuestionIcon from "@/components/icons/QuestionIcon";
import ScheduleLinkCopy from "@/components/ScheduleLinkCopy";
import { API_URL } from "@/lib/schedule/api";
import { Dialog } from "@headlessui/react";
import React, { useRef } from "react";

export type ScheduleDialogProps = {
  groupFile: string;
  opened: boolean;
  close?: () => void;
};

export default function ScheduleDialog({
  groupFile,
  opened,
  close,
}: ScheduleDialogProps) {
  const calendarURL = `${API_URL}/schedule/${groupFile}`;
  const copyButtonRef = useRef(null);

  return (
    <Dialog
      open={opened}
      initialFocus={copyButtonRef}
      onClose={() => {
        close && close();
      }}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/75" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl max-h-[90dvh] rounded-xl bg-background overflow-y-scroll">
          <Dialog.Title className="text-xl font-bold">
            <div className="flex flex-row w-full">
              <div className="grow items-center pl-8 pt-6">
                Import to your calendar
              </div>
              <button
                className="rounded-xl w-fit p-4"
                onClick={() => {
                  close && close();
                }}
              >
                <CloseIcon className="fill-gray-300 hover:fill-white w-10" />
              </button>
            </div>
          </Dialog.Title>
          <div className="px-8">
            <Dialog.Description className="text-white/75">
              You can add the schedule to your favorite calendar application and
              it will be updated on schedule changes.
            </Dialog.Description>

            <ul className="list-decimal pl-4 text-white/75 my-4">
              <li>
                Copy the link.
                <ScheduleLinkCopy
                  url={calendarURL}
                  copyButtonRef={copyButtonRef}
                />
              </li>
              <li>
                Open your calendar settings to add a calendar by URL.
                <a
                  className="underline ml-4 flex flex-row items-baseline gap-x-2 w-fit"
                  href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                >
                  <LinkIcon className="h-4 w-4" />
                  Google Calendar
                </a>
                <a className="ml-4 flex flex-row items-baseline gap-x-2 w-fit">
                  <QuestionIcon className="h-4 w-4" />
                  Other applications: find in settings
                </a>
              </li>
              <li>Paste the link and click Add.</li>
            </ul>
          </div>

          <br />

          <Calendar url={calendarURL} />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
