import { getWorkshopsLink } from "@/api/schedule/links.ts";
import { TargetForExport } from "@/api/schedule/types.ts";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { ExportModal } from "@/components/calendar/ExportModal.tsx";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import { useState } from "react";

export function EventsCalendarPage() {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <>
      <div className="px-4">
        <div className="my-4 flex flex-row flex-wrap items-center">
          <h2 className="flex grow text-3xl font-medium">Events calendar</h2>
          <ExportButton
            tooltip="Export your personal calendar"
            onClick={() => setExportModalOpen(true)}
          />
        </div>
      </div>
      <Calendar
        urls={[
          {
            url: getWorkshopsLink(),
            sourceLink: "/events",
            updatedAt: new Date().toISOString(),
          },
        ]}
        initialView="timeGridWeek"
        viewId="events"
      />
      <ExportModal
        eventGroupOrTarget={TargetForExport.workshops}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
