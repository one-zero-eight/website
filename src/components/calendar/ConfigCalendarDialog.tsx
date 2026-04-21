import { $events } from "@/api/events";
import { Modal } from "@/components/common/Modal.tsx";
import { GroupCardById } from "@/components/schedule/group-card/GroupCardById.tsx";
import { PersonalCard } from "@/components/schedule/group-card/PersonalCard.tsx";
import { useMyMusicRoom } from "@/api/events/event-group.ts";
import { Link } from "@tanstack/react-router";
import { TargetForExport } from "@/api/events/types.ts";
import { useState } from "react";
import { ExportModal } from "@/components/calendar/ExportModal.tsx";

export function ConfigCalendarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: predefined } = $events.useQuery("get", "/users/me/predefined");

  const { isSuccess: musicRoomIsSuccess } = useMyMusicRoom();

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [targetForExport, setTargetForExport] = useState<
    number | TargetForExport | null
  >(null);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Config & Export"
      containerClassName="xl:max-w-[75%] bg-base-100"
    >
      <div className="grid grid-cols-1 justify-stretch gap-4 @2xl/modal:grid-cols-2">
        {predefined?.event_groups.map((v) => (
          <GroupCardById
            key={v}
            groupId={v}
            canHide={true}
            exportButtonOnClick={() => {
              setTargetForExport(v);
              setExportModalOpen(true);
            }}
          />
        ))}

        {eventsUser?.favorite_event_groups?.map((v) => (
          <GroupCardById
            key={v}
            groupId={v}
            canHide={true}
            exportButtonOnClick={() => {
              setTargetForExport(v);
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
            setTargetForExport(TargetForExport.sport);
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
              setTargetForExport(TargetForExport.music_room);
              setExportModalOpen(true);
            }}
          />
        )}
        <PersonalCard
          name="Moodle"
          description="Your Moodle deadlines"
          targetType={TargetForExport.moodle}
          exportButtonOnClick={() => {
            setTargetForExport(TargetForExport.moodle);
            setExportModalOpen(true);
          }}
        />
        <PersonalCard
          name="Room booking"
          description="Your room bookings"
          targetType={TargetForExport.room_bookings}
          exportButtonOnClick={() => {
            setTargetForExport(TargetForExport.room_bookings);
            setExportModalOpen(true);
          }}
        />
      </div>

      <p className="text-base-content/75 mb-4 text-lg">
        Add favorite calendars using star button.
        <br />
        <Link to="/schedule" className="underline underline-offset-4">
          Explore schedules
        </Link>
      </p>

      <ExportModal
        eventGroupOrTarget={targetForExport}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        aboveModal
      />
    </Modal>
  );
}
