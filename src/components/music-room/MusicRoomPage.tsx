import { Calendar } from "@/components/calendar/Calendar.tsx";
import { Trans, useLingui } from "@lingui/react/macro";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import {
  getMusicRoomLink,
  getMyMusicRoomLink,
} from "@/api/schedule/calendars/links.ts";
import { useState } from "react";
import { ExportModal } from "@/components/calendar/ExportModal.tsx";
import { TargetForExport } from "@/api/schedule/types.ts";
export function MusicRoomPage() {
  const { t } = useLingui();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  return (
    <>
      <div className="px-4">
        <div className="my-4 flex flex-row flex-wrap items-center">
          <h2 className="flex grow text-3xl font-medium">
            <Trans>Booking calendar</Trans>
          </h2>
          <ExportButton
            tooltip={t`Export your personal calendar`}
            onClick={() => setExportModalOpen(true)}
          />
        </div>
      </div>
      <Calendar
        config={{
          urls: [
            {
              url: getMusicRoomLink(),
              sourceLink: "https://telegram.me/InnoMusicRoomBot",
              updatedAt: new Date().toISOString(),
            },
            {
              url: getMyMusicRoomLink(),
              color: "seagreen",
              sourceLink: "https://telegram.me/InnoMusicRoomBot",
              updatedAt: new Date().toISOString(),
            },
          ],
        }}
        initialView="timeGridWeek"
        viewStorageId="music-room"
      />
      <ExportModal
        target={{
          type: "personal",
          target: TargetForExport.music_room,
        }}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
