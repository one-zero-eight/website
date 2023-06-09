"use client";
import LinkIcon from "@/components/icons/LinkIcon";
import QuestionIcon from "@/components/icons/QuestionIcon";
import { API_URL } from "@/lib/schedule/api";
import { Dialog } from "@headlessui/react";
import React, { useRef, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

export type ScheduleDialogProps = {
  category: string;
  group: string;
  opened: boolean;
  close?: () => void;
};

export default function ScheduleDialog({
  category,
  group,
  opened,
  close,
}: ScheduleDialogProps) {
  const [_, _copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState<any>();
  const copyButtonRef = useRef(null);

  const calendarURL = `${API_URL}/schedule/${category}/${group}.ics`;

  const copy = () => {
    _copy(calendarURL).then((ok) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (ok) {
        setCopied(true);
        setTimer(setTimeout(() => setCopied(false), 1500));
      } else {
        setCopied(false);
      }
    });
  };

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
        <Dialog.Panel className="mx-auto max-w-lg rounded-xl bg-background p-8">
          <Dialog.Title className="text-xl font-bold">
            Import to your calendar
          </Dialog.Title>
          <Dialog.Description className="text-white/75">
            You can add the schedule to your favorite calendar application and
            it will be updated on schedule changes.
          </Dialog.Description>

          <ul className="list-decimal pl-4 text-white/75 my-4">
            <li>
              Copy the link.
              <div className="flex flex-row flex-wrap gap-2 my-2">
                <input
                  readOnly
                  value={calendarURL}
                  className="p-2 rounded-xl grow"
                />
                <button
                  className="p-2 rounded-xl w-fit selected"
                  ref={copyButtonRef}
                  onClick={copy}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </li>
            <li>
              Open your calendar settings to add a calendar by URL.
              <a
                className="underline ml-4 text-sm sm:text-lg flex flex-row items-baseline gap-x-2 w-fit"
                href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
              >
                <LinkIcon className="h-4 w-4" />
                Google Calendar
              </a>
              <a className="ml-4 text-sm sm:text-lg flex flex-row items-baseline gap-x-2 w-fit">
                <QuestionIcon className="h-4 w-4" />
                Other applications: find in settings
              </a>
            </li>
            <li>Paste the link and click Add.</li>
          </ul>

          <p className="text-white/75">
            Do not forget to import all calendars (for core courses and
            electives).
          </p>

          <div className="flex flex-row w-full">
            <div className="grow"></div>
            <button
              className="p-2 rounded-xl w-fit"
              onClick={() => {
                close && close();
              }}
            >
              Done
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
