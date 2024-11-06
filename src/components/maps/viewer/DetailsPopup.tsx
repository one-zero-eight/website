import { mapsTypes } from "@/api/maps";
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
import React, { useEffect, useRef } from "react";

export function DetailsPopup({
  elementRef,
  area,
  isOpen,
  setIsOpen,
}: {
  elementRef: Element | null;
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
          className="z-10 flex max-w-md flex-col gap-2 rounded-2xl bg-primary-main p-4 text-sm text-text-main drop-shadow-md"
        >
          <div className="flex flex-row gap-2">
            <div className="text-bold flex whitespace-pre-wrap text-xl [overflow-wrap:anywhere]">
              Room: <span className="font-medium">{area.title}</span>
            </div>
          </div>
          {area.description && (
            <div className="flex flex-row gap-2">
              <div className="w-6">
                <span className="icon-[material-symbols--notes] text-2xl" />
              </div>
              <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                {area.description}
              </p>
            </div>
          )}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="fill-primary-main"
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
