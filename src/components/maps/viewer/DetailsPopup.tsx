import { mapsTypes } from "@/api/maps";
import Tooltip from "@/components/common/Tooltip.tsx";
import FoundPersonModal from "@/components/common/FoundPersonModal.tsx";
import { useFoundPeople } from "@/lib/easter-eggs/FoundPeopleContext.tsx";
import { getMapAreaUrl } from "@/lib/maps/links.ts";
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
  const [foundOpen, setFoundOpen] = useState(false);
  const { markFound } = useFoundPeople();
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
          className="z-10 flex max-w-md flex-col gap-2 rounded-2xl bg-primary p-4 text-sm text-contrast drop-shadow-md"
        >
          <div className="flex flex-row justify-between gap-2">
            <div className="text-bold flex whitespace-pre-wrap text-xl [overflow-wrap:anywhere]">
              <span className="font-medium">{area.title}</span>
            </div>

            <ShareButton scene={scene} area={area} />
          </div>
          {area.description && (
            <div className="flex flex-row gap-2">
              <div className="w-6">
                {area.title == "108" ? (
                  <span className="icon-[material-symbols--user-attributes-rounded] text-2xl" />
                ) : (
                  <span className="icon-[material-symbols--notes] text-2xl" />
                )}
              </div>
              <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                {area.title == "108" ? (
                  <button
                    type="button"
                    onClick={() => {
                      markFound("Khayotbek Mamajonov");
                      setFoundOpen(true);
                    }}
                    className="underline underline-offset-2 hover:text-contrast"
                  >
                    Khayotbek Mamajonov
                  </button>
                ) : (
                  area.description
                )}
              </p>
            </div>
          )}
          {area.people.length >= 1 && (
            <div className="flex flex-row gap-2">
              <div className="w-6">
                <span className="icon-[material-symbols--user-attributes-rounded] text-2xl" />
              </div>
              <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                {/* Show only English names */}
                {area.people.filter((v) => /^[A-Za-z -]+$/.test(v)).join(",\n")}
              </p>
            </div>
          )}
          {area.room_booking_id && (
            <div className="flex flex-row gap-2">
              <div className="w-6">
                <span className="icon-[ph--door-open] text-2xl" />
              </div>
              <Link
                to="/room-booking"
                className="flex w-full whitespace-pre-wrap py-1 underline underline-offset-2 [overflow-wrap:anywhere]"
              >
                Book this room
              </Link>
            </div>
          )}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="fill-primary"
          />
        </div>
      </FloatingFocusManager>
      <FoundPersonModal open={foundOpen} onOpenChange={setFoundOpen} />
    </FloatingPortal>
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
          "flex items-center justify-center rounded-full hover:bg-secondary-hover",
          copied && "text-green-700 dark:text-green-500",
        )}
        onClick={() => copy()}
      >
        <span className="icon-[material-symbols--share-outline] text-2xl" />
      </button>
    </Tooltip>
  );
}
