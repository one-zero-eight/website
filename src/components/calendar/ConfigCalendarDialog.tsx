import { $schedule } from "@/api/schedule";
import { Modal } from "@/components/common/Modal.tsx";
import { GroupCardByAlias } from "@/components/schedule/group-card/GroupCardByAlias.tsx";
import { PersonalCard } from "@/components/schedule/personal-card/PersonalCard.tsx";
import { useMyMusicRoom } from "@/api/schedule/event-group.ts";
import { Link } from "@tanstack/react-router";
import { TargetForExport } from "@/api/schedule/types.ts";
import { useState } from "react";
import {
  ExportModal,
  ExportTarget,
} from "@/components/calendar/ExportModal.tsx";
import { LinkedCard } from "@/components/schedule/linked-card/LinkedCard.tsx";
import { ImportModal } from "@/components/calendar/import/ImportModal";

export function ConfigCalendarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");
  const { data: predefined } = $schedule.useQuery(
    "get",
    "/users/me/predefined",
  );

  const { isSuccess: musicRoomIsSuccess } = useMyMusicRoom();

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [targetForExport, setTargetForExport] = useState<ExportTarget | null>(
    null,
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Config & Export"
      containerClassName="xl:max-w-[75%] bg-base-100"
    >
      <div className="grid grid-cols-1 justify-stretch gap-4 @2xl/modal:grid-cols-2">
        {predefined?.event_groups.map((v) => (
          <GroupCardByAlias
            key={v}
            groupAlias={v}
            canHide={true}
            exportButtonOnClick={() => {
              setTargetForExport({ type: "event-group", alias: v });
              setExportModalOpen(true);
            }}
          />
        ))}

        {scheduleUser?.favorite_event_groups?.map((v) => (
          <GroupCardByAlias
            key={v}
            groupAlias={v}
            canHide={true}
            exportButtonOnClick={() => {
              setTargetForExport({ type: "event-group", alias: v });
              setExportModalOpen(true);
            }}
          />
        ))}

        <PersonalCard
          name="Sport"
          description="Your sport checkins"
          pageUrl="/sport"
          targetType={TargetForExport.sport}
          exportButtonOnClick={() => {
            setTargetForExport({
              type: "personal",
              target: TargetForExport.sport,
            });
            setExportModalOpen(true);
          }}
        />
        {musicRoomIsSuccess && (
          <PersonalCard
            name="Music room"
            description="Your music room bookings"
            pageUrl="/music-room"
            targetType={TargetForExport.music_room}
            exportButtonOnClick={() => {
              setTargetForExport({
                type: "personal",
                target: TargetForExport.music_room,
              });
              setExportModalOpen(true);
            }}
          />
        )}
        <PersonalCard
          name="Moodle"
          description="Your Moodle deadlines"
          targetType={TargetForExport.moodle}
          exportButtonOnClick={() => {
            setTargetForExport({
              type: "personal",
              target: TargetForExport.moodle,
            });
            setExportModalOpen(true);
          }}
        />
        <PersonalCard
          name="Room booking"
          description="Your room bookings"
          targetType={TargetForExport.room_bookings}
          exportButtonOnClick={() => {
            setTargetForExport({
              type: "personal",
              target: TargetForExport.room_bookings,
            });
            setExportModalOpen(true);
          }}
        />
        {Object.keys(scheduleUser?.linked_calendars || {}).map((key, index) => {
          const linkedCalendar = scheduleUser?.linked_calendars
            ? scheduleUser?.linked_calendars[key]
            : null;
          return (
            <LinkedCard
              key={linkedCalendar?.id ?? `${key}-${index}`}
              linkedCalendar={linkedCalendar}
            />
          );
        })}
      </div>

      <p className="text-base-content/75 mb-4 text-lg">
        Add favorite calendars using star button or{" "}
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="underline underline-offset-4"
        >
          import your own calendars
        </button>{" "}
        to InNoHassle.
        <br />
        <Link to="/schedule" className="underline underline-offset-4">
          Explore schedules
        </Link>
      </p>

      <ExportModal
        target={targetForExport}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        aboveModal
      />
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSubmit={() => setImportModalOpen(false)}
        aboveModal
      />
    </Modal>
  );
}
