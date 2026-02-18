import { Calendar } from "@/components/calendar/Calendar.tsx";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import { getMusicRoomLink, getMyMusicRoomLink } from "@/api/events/links.ts";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExportModal } from "@/components/calendar/ExportModal.tsx";
import { TargetForExport } from "@/api/events/types.ts";

export function MusicRoomPage() {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  return (
    <>
      <div className="px-4">
        <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
          <div className="flex flex-col gap-4">
            <a
              href="https://t.me/InnoMusicRoomBot"
              className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
            >
              <div className="w-12">
                <span className="icon-[mdi--robot-excited-outline] text-primary text-5xl" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-base-content text-2xl font-semibold">
                  Telegram bot
                </p>
                <p className="text-base-content/75 text-lg">
                  Register in Telegram bot to book timeslots.
                </p>
              </div>
            </a>
            <Link
              to="/music-room/instructions"
              className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
            >
              <div className="w-12">
                <span className="icon-[material-symbols--quick-reference-outline-rounded] text-primary text-5xl" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-base-content text-2xl font-semibold">
                  Instructions
                </p>
                <p className="text-base-content/75 text-lg">
                  Read rules and guides on how to access the Music room. Every
                  visitor should accept these conditions.
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => {
                const encodedURL =
                  "aHR0cHM6Ly90Lm1lL2pvaW5jaGF0L0RqaHlaa0JOLUZtWlN0eFRCNDBxd1E=";
                const url = atob(encodedURL);
                window.open(url, "_blank");
              }}
              className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6 text-left"
            >
              <div className="w-12">
                <span className="icon-[ic--baseline-telegram] text-primary text-5xl" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-base-content text-2xl font-semibold">
                  Telegram chat
                </p>
                <p className="text-base-content/75 text-lg">
                  Join telegram chat to receive latest news about Music room and
                  ask questions.
                </p>
              </div>
            </button>
          </div>
          <div className="bg-base-200 rounded-box flex w-full flex-row items-center justify-center p-4">
            <iframe
              width="704"
              height="396"
              src="https://www.youtube-nocookie.com/embed/mGfdun8ah3g"
              title="How to get to the Innopolis Music room?"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                borderRadius: "1rem",
                width: "100%",
                height: "100%",
                aspectRatio: "16/9",
              }}
            ></iframe>
          </div>
        </div>
        <div className="my-4 flex flex-row flex-wrap items-center">
          <h2 className="flex grow text-3xl font-medium">Booking calendar</h2>
          <ExportButton
            tooltip="Export your personal calendar"
            onClick={() => setExportModalOpen(true)}
          />
        </div>
      </div>
      <Calendar
        urls={[
          {
            url: getMusicRoomLink(),
            sourceLink: "https://t.me/InnoMusicRoomBot",
            updatedAt: new Date().toISOString(),
          },
          {
            url: getMyMusicRoomLink(),
            color: "seagreen",
            sourceLink: "https://t.me/InnoMusicRoomBot",
            updatedAt: new Date().toISOString(),
          },
        ]}
        initialView="timeGridWeek"
        viewId="music-room"
      />
      <ExportModal
        eventGroupOrTarget={TargetForExport.music_room}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
