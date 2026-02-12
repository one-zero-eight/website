import { $events } from "@/api/events";
import { GroupCardById } from "@/components/schedule/group-card/GroupCardById.tsx";
import { PersonalCard } from "@/components/schedule/group-card/PersonalCard.tsx";
import { useMyMusicRoom } from "@/api/events/event-group.ts";
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
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

  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [targetForExport, setTargetForExport] = useState<
    number | TargetForExport | null
  >(null);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/export z-10 grid place-items-center bg-black/75"
        lockScroll
      >
        <FloatingFocusManager context={context} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full flex-col p-4 @2xl/export:w-3/4 @5xl/export:w-1/2"
          >
            <div className="bg-base-200 rounded-box overflow-hidden">
              <div className="flex flex-col p-4">
                {/* Heading and description */}
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    Config & Export
                  </div>
                  <button
                    type="button"
                    className="text-base-content/50 hover:bg-inh-primary-hover/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 flex h-12 w-12 items-center justify-center"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>

                {/* Content */}
                <div className="@container/sections flex flex-col justify-between gap-4 @6xl/content:flex-row @6xl/content:gap-8">
                  <div className="grid grid-cols-1 justify-stretch gap-4 @6xl/sections:grid-cols-2">
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
                    <Link
                      to="/schedule"
                      className="underline underline-offset-4"
                    >
                      Explore schedules
                    </Link>
                  </p>
                </div>
              </div>
            </div>
            <ExportModal
              eventGroupOrTarget={targetForExport}
              open={exportModalOpen}
              onOpenChange={setExportModalOpen}
              aboveModal
            />
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
