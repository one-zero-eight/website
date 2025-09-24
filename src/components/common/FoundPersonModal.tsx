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
import Confetti from "react-confetti-boom";

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
        className="z-10 grid place-items-center bg-black/75 px-4 py-6 @container/export sm:px-8 sm:py-8"
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
            className="w-full max-w-[680px]"
          >
            {remaining === 0 && (
              <Confetti
                mode="boom"
                colors={["#A855F7", "#EC4899", "#F59E0B", "#22C55E"]}
                particleCount={140}
              />
            )}

            <div className="overflow-hidden rounded-2xl bg-floating shadow-2xl ring-1 ring-white/10">
              <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500" />
              <div className="flex flex-col p-4 sm:p-6">
                <div className="mb-3 flex w-full flex-shrink-0 flex-row items-center gap-2 sm:gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl sm:h-10 sm:w-10 sm:text-2xl">
                    🎉
                  </div>
                  <div className="min-w-0 grow items-center break-words text-xl font-semibold leading-tight sm:text-2xl md:text-3xl lg:text-4xl">
                    Congrats you found the people
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-2xl text-contrast/50 hover:bg-primary-hover/50 hover:text-contrast/75"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>
                <div className="text-contrast/80">
                  {remaining > 0
                    ? `You found ${list.length} of ${total} people — keep going!`
                    : `You found ${list.length} of ${total} people — great job! 🏆`}
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/10">
                  {remaining == 2 && (
                    <img
                      src="/tenor1.gif"
                      alt="Ryan Gosling winks"
                      className="block h-auto w-full"
                      loading="lazy"
                    />
                  )}
                  {remaining == 1 && (
                    <img
                      src="/tenor2.gif"
                      alt="Ryan Gosling winks"
                      className="block h-auto w-full"
                      loading="lazy"
                    />
                  )}

                  {remaining === 0 && (
                    <img
                      src="/tenor.gif"
                      alt="Ryan Gosling winks"
                      className="block h-auto w-full"
                      loading="lazy"
                    />
                  )}
                </div>

                <ol className="mt-4 space-y-1 pl-5 text-contrast/90 [counter-reset:item]">
                  {list.map((name) => (
                    <li key={name} className="flex items-center gap-2 py-0.5">
                      <span className="icon-[material-symbols--check-circle-rounded] text-green-500" />
                      <span>{name}</span>
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
