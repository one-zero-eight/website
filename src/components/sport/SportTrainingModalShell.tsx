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
import { useRef, type ReactNode } from "react";

export function SportTrainingModalShell({
  open,
  onOpenChange,
  title,
  titleBadges,
  closeDisabled,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleBadges?: ReactNode;
  closeDisabled?: boolean;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const { context, refs } = useFloating({ open, onOpenChange });
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);
  const dismiss = useDismiss(context, { capture: true });
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/modal z-20 grid place-items-center bg-black/75"
        lockScroll
        onClick={(e) => e.stopPropagation()}
      >
        <FloatingFocusManager context={context} initialFocus={closeRef} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex max-h-[min(90vh,720px)] w-full max-w-lg p-4"
          >
            <div className="bg-base-200 rounded-box flex max-h-full w-full flex-col overflow-hidden">
              <div className="border-b-base-300 flex shrink-0 items-start justify-between gap-2 border-b p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold wrap-break-word">
                    {title}
                  </h2>
                  {titleBadges}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="text-base-content/50 hover:bg-base-300/50 hover:text-base-content/75 rounded-box flex h-10 w-10 shrink-0 items-center justify-center"
                  onClick={() => onOpenChange(false)}
                  disabled={closeDisabled}
                >
                  <span className="icon-[material-symbols--close] text-2xl" />
                </button>
              </div>
              {children}
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
