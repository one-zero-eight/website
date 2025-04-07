import { $events } from "@/api/events";
import { GroupCardById } from "@/components/schedule/group-card/GroupCardById.tsx";
import LinkIconButton from "@/components/schedule/group-card/LinkIconButton.tsx";
import { PersonalCard } from "@/components/schedule/group-card/PersonalCard.tsx";
import { useMyMusicRoom } from "@/lib/events/event-group.ts";
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

export function SourcesDialog({
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

  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="z-10 grid place-items-center bg-black/75 @container/export"
        lockScroll
      >
        <FloatingFocusManager context={context} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full flex-col p-4 @2xl/export:w-3/4 @5xl/export:w-1/2"
          >
            <div className="overflow-hidden rounded-2xl bg-floating">
              <div className="flex flex-col p-4">
                {/* Heading and description */}
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    Calendar sources
                  </div>
                  <button
                    type="button"
                    className="-mr-2 -mt-2 flex h-12 w-12 items-center justify-center rounded-2xl text-contrast/50 hover:bg-primary-hover/50 hover:text-contrast/75"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex flex-col justify-between gap-4 @container/sections @6xl/content:flex-row @6xl/content:gap-8">
                  <div className="grid grid-cols-1 justify-stretch gap-4 @lg/sections:grid-cols-2 @6xl/sections:grid-cols-3">
                    {predefined?.event_groups.map((v) => (
                      <GroupCardById key={v} groupId={v} canHide={true} />
                    ))}

                    {eventsUser?.favorite_event_groups?.map((v) => (
                      <GroupCardById key={v} groupId={v} canHide={true} />
                    ))}

                    <PersonalCard
                      name="Sport"
                      description="Your sport schedule"
                      pageUrl="/sport"
                      buttons={
                        <LinkIconButton
                          href="https://t.me/IUSportBot"
                          icon={
                            <span className="icon-[mdi--robot-excited-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
                          }
                          tooltip="Open Telegram bot"
                        />
                      }
                    />
                    {musicRoomIsSuccess && (
                      <PersonalCard
                        name="Music room"
                        description="Your room bookings"
                        pageUrl="/music-room"
                        buttons={
                          <LinkIconButton
                            href="https://t.me/InnoMusicRoomBot"
                            icon={
                              <span className="icon-[mdi--robot-excited-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
                            }
                            tooltip="Open Telegram bot"
                          />
                        }
                      />
                    )}
                    <PersonalCard
                      name={
                        <span className="flex items-center">
                          Moodle
                          <span className="ml-2 rounded-full bg-brand-violet px-2 py-1 text-xs font-semibold text-white">
                            NEW
                          </span>
                        </span>
                      }
                      description="Your Moodle deadlines"
                      buttons={
                        <LinkIconButton
                          href="/extension"
                          icon={
                            <span className="icon-[material-symbols--extension-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
                          }
                          tooltip="Install the browser extension to sync Moodle calendar"
                        />
                      }
                    />
                  </div>

                  <p className="mb-4 text-lg text-contrast/75">
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
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
