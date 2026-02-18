import { mapsTypes } from "@/api/maps";
import { $roomBooking } from "@/api/room-booking";
import Tooltip from "@/components/common/Tooltip.tsx";
import { getMapAreaUrl } from "@/components/maps/links.ts";
import { AccessLevelIcon } from "@/components/room-booking/AccessLevelIcon.tsx";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

export function DetailsPopup({
  elementRef,
  scene,
  area,
  isOpen,
  setIsOpen,
}: {
  elementRef: Element | null;
  scene: mapsTypes.SchemaScene;
  area: mapsTypes.SchemaArea | undefined;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const arrowRef = useRef<SVGSVGElement>(null);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    placement: "bottom",
    middleware: [
      offset(({ rects }) => -rects.reference.height / 2 + 16),
      flip({ fallbackAxisSideDirection: "end" }),
      shift(),
      arrow({
        element: arrowRef,
        padding: 16, // Do not go to rounded corners
      }),
    ],
    elements: {
      reference: elementRef,
    },
  });
  useEffect(() => {
    refs.setPositionReference(elementRef);
  }, [elementRef, refs]);

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    common: {
      transitionProperty: "all",
    },
    duration: 200,
  });

  // Event listeners to change the open state
  const dismiss = useDismiss(context, {
    outsidePressEvent: "click",
    referencePress: true,
    capture: {
      outsidePress: false,
    },
  });
  // Role props for screen readers
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!isMounted || !area) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, ...transitionStyles }}
          {...getFloatingProps()}
          className="bg-base-200 text-base-content rounded-box z-10 flex max-w-md flex-col gap-2 p-4 text-sm drop-shadow-md"
        >
          <div className="flex flex-row justify-between gap-2">
            <div className="text-bold flex text-xl wrap-anywhere whitespace-pre-wrap">
              <span className="font-medium">{area.title}</span>
            </div>

            <ShareButton scene={scene} area={area} />
          </div>
          {area.description && (
            <div className="flex flex-row gap-2">
              <div className="w-6">
                <span className="icon-[material-symbols--notes] text-2xl" />
              </div>
              <p className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap">
                {area.description}
              </p>
            </div>
          )}
          {area.people.length >= 1 && (
            <div className="flex flex-row gap-2">
              <div className="w-6">
                <span className="icon-[material-symbols--user-attributes-rounded] text-2xl" />
              </div>
              <p className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap">
                {/* Show only English names */}
                {area.people.filter((v) => /^[A-Za-z -]+$/.test(v)).join(",\n")}
              </p>
            </div>
          )}
          {area.room_booking_id && (
            <RoomBookingDetails roomId={area.room_booking_id} />
          )}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="fill-base-200"
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}

function RoomBookingDetails({ roomId }: { roomId: string }) {
  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/", {
    params: { query: { include_red: true } },
  });
  const room = rooms?.find((r) => r.id === roomId);

  return (
    <>
      {room?.capacity && (
        <div className="flex flex-row gap-2">
          <div className="w-6">
            <span className="icon-[material-symbols--event-seat-outline-rounded] text-2xl" />
          </div>
          <p className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap">
            Capacity: {room.capacity} people
          </p>
        </div>
      )}
      {room?.access_level && (
        <div className="flex flex-row gap-2">
          <div className="w-6">
            <AccessLevelIcon
              accessLevel={room.access_level}
              className="text-2xl"
            />
          </div>
          <p className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap">
            Access level: {room.access_level}
          </p>
        </div>
      )}
      <div className="flex flex-row gap-2">
        <div className="w-6">
          <span className="icon-[ph--door-open] text-2xl" />
        </div>
        <Link
          to="/room-booking/rooms/$room"
          params={{ room: roomId }}
          className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap underline underline-offset-2"
        >
          Book this room
        </Link>
      </div>
    </>
  );
}

function ShareButton({
  scene,
  area,
}: {
  scene: mapsTypes.SchemaScene;
  area: mapsTypes.SchemaArea;
}) {
  const [_, _copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState<any>();

  const copy = () => {
    const url = getMapAreaUrl(scene, area);

    _copy(url).then((ok) => {
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
    <Tooltip
      content={
        <div className={copied ? "text-green-700 dark:text-green-500" : ""}>
          {!copied ? "Share link to this room" : "Link copied!"}
        </div>
      }
    >
      <button
        type="button"
        className={clsx(
          "hover:bg-base-300 flex items-center justify-center rounded-full",
          copied && "text-green-700 dark:text-green-500",
        )}
        onClick={() => copy()}
      >
        <span className="icon-[material-symbols--share-outline] text-2xl" />
      </button>
    </Tooltip>
  );
}
