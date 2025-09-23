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
import { useMemo, useRef } from "react";
import {
  TARGET_PEOPLE,
  useFoundPeople,
} from "@/lib/easter-eggs/FoundPeopleContext.tsx";

export function FoundPersonModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { found } = useFoundPeople();
  const { context, refs } = useFloating({ open, onOpenChange });

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const list = useMemo(() => Array.from(found), [found]);
  const total = TARGET_PEOPLE.length;
  const remaining = Math.max(0, total - list.length);

  if (!isMounted) return null;

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="z-10 grid place-items-center bg-black/75 @container/export"
        lockScroll
      >
        <FloatingFocusManager
          context={context}
          initialFocus={closeButtonRef}
          modal
        >
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full flex-col p-4 @2xl/export:w-3/4 @5xl/export:w-1/2"
          >
            <div className="overflow-hidden rounded-2xl bg-floating">
              <div className="flex flex-col p-4">
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    Congrats you found the people
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="-mr-2 -mt-2 flex h-12 w-12 items-center justify-center rounded-2xl text-contrast/50 hover:bg-primary-hover/50 hover:text-contrast/75"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>
                <div className="text-contrast/75">
                  You found {list.length} of {total} people
                  {remaining > 0 ? ", keep going!" : " — great job!"}
                </div>
                <ol className="mt-3 list-decimal pl-6 text-contrast/90">
                  {list.map((name) => (
                    <li key={name} className="py-0.5">
                      {name}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}

export default FoundPersonModal;
