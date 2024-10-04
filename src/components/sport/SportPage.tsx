import { Calendar } from "@/components/calendar/Calendar.tsx";
import { SportExportModal } from "@/components/calendar/SportExportModal.tsx";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import { getMySportLink } from "@/lib/events/links.ts";
import { useState } from "react";

export function SportPage() {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  return (
    <>
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
              <p className="flex items-center text-2xl font-semibold text-text-main">
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
              <p className="text-2xl font-semibold text-text-main">
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
      <div className="my-4 flex flex-row flex-wrap items-center">
        <h2 className="flex grow text-3xl font-medium">Sport calendar</h2>
        <ExportButton
          tooltip="Export your personal calendar"
          onClick={() => setExportModalOpen(true)}
        />
      </div>
      <div className="-mx-4 -mb-4 @2xl/main:-mx-12 @2xl/main:-mb-12">
        <Calendar
          urls={[
            {
              url: getMySportLink(),
              color: "seagreen",
              sourceLink: "https://sport.innopolis.university",
              updatedAt: new Date().toISOString(),
            },
          ]}
          initialView="timeGridWeek"
          viewId="music-room"
        />
      </div>
      <SportExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
