"use client";
import Calendar from "@/components/common/calendar/Calendar";
import { NavbarTemplate } from "@/components/layout/Navbar";
import { getMusicRoomLink, getMyMusicRoomLink } from "@/lib/events";

export default function Page() {
  return (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <NavbarTemplate
        title="Music room"
        description="Book the Music room in Sports center freely."
      />
      <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <div className="flex flex-col gap-4">
          <a
            href="https://t.me/InnoMusicRoomBot"
            className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
          >
            <div className="w-12">
              <span className="icon-[mdi--robot-excited-outline] text-5xl text-[#9747FF]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-2xl font-semibold text-text-main underline-offset-4 group-hover:underline">
                Telegram bot
              </p>
              <p className="text-lg text-text-secondary/75">
                Register in Telegram bot to book timeslots.
              </p>
            </div>
          </a>
          <a
            href="https://bit.ly/inno-music-room"
            className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
          >
            <div className="w-12">
              <span className="icon-[material-symbols--quick-reference-outline-rounded] text-5xl text-[#9747FF]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-2xl font-semibold text-text-main underline-offset-4 group-hover:underline">
                Instructions
              </p>
              <p className="text-lg text-text-secondary/75">
                Read rules and guides on how to access the Music room. Every
                visitor should accept these conditions.
              </p>
            </div>
          </a>
          <button
            onClick={() => {
              const encodedURL =
                "aHR0cHM6Ly90Lm1lL2pvaW5jaGF0L0RqaHlaa0JOLUZtWlN0eFRCNDBxd1E=";
              const url = atob(encodedURL);
              window.open(url, "_blank");
            }}
            className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 text-left hover:bg-secondary-main"
          >
            <div className="w-12">
              <span className="icon-[ic--baseline-telegram] text-5xl text-[#9747FF]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-2xl font-semibold text-text-main underline-offset-4 group-hover:underline">
                Telegram chat
              </p>
              <p className="text-lg text-text-secondary/75">
                Join telegram chat to receive latest news about Music room and
                ask questions.
              </p>
            </div>
          </button>
        </div>
        <div className="flex w-full flex-row items-center justify-center rounded-2xl bg-primary-main p-4">
          <iframe
            width="704"
            height="396"
            src="https://www.youtube-nocookie.com/embed/mGfdun8ah3g?si=ObZXOHLvwFbIWUBw"
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
      <h2 className="my-4 text-3xl font-medium">Booking calendar</h2>
      <div className="@2xl/content:-mx-8">
        <Calendar
          urls={[
            getMusicRoomLink(),
            {
              url: getMyMusicRoomLink(),
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
