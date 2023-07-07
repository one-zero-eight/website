"use client";
import Calendar from "@/components/Calendar";
import CloseIcon from "@/components/icons/CloseIcon";
import LinkIcon from "@/components/icons/LinkIcon";
import QuestionIcon from "@/components/icons/QuestionIcon";
import ScheduleLinkCopy from "@/components/ScheduleLinkCopy";
import { SCHEDULE_API_URL } from "@/lib/schedule/api";
import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useRef } from "react";

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
  const calendarURL = `${SCHEDULE_API_URL}/${groupFile}`;
  const copyButtonRef = useRef(null);

  return (
    <Transition
      show={opened}
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      <Dialog
        initialFocus={copyButtonRef}
        onClose={() => {
          close && close();
        }}
        className="relative z-50"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" aria-hidden="true" />
        </Transition.Child>

        <div
          className={`fixed inset-0 flex p-4 ${
            opened ? "overflow-y-scroll" : ""
          }`}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl h-fit my-auto rounded-xl bg-primary overflow-hidden">
              <Dialog.Title className="text-xl font-bold">
                <div className="flex flex-row w-full">
                  <div className="grow items-center pl-4 sm:pl-8 pt-6">
                    Import to your calendar
                  </div>
                  <button
                    className="rounded-xl w-fit p-4"
                    onClick={() => {
                      close && close();
                    }}
                  >
                    <CloseIcon className="fill-icon hover:fill-icon_hover w-10" />
                  </button>
                </div>
              </Dialog.Title>
              <div className="px-4 sm:px-8">
                <Dialog.Description className="text-text_secondary">
                  You can add the schedule to your favorite calendar application
                  and it will be updated on schedule changes.
                </Dialog.Description>

                <ul className="list-decimal pl-4 text-text_secondary my-4">
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
                      <LinkIcon className="h-4 w-4 fill-icon" />
                      Google Calendar
                    </a>
                    <a className="ml-4 flex flex-row items-baseline gap-x-2 w-fit">
                      <QuestionIcon className="h-4 w-4 fill-icon" />
                      Other applications: find in settings
                    </a>
                  </li>
                  <li>Paste the link and click Add.</li>
                </ul>
              </div>

              <br />

              <Calendar urls={[calendarURL]} />
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
