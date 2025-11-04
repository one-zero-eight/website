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
import { useRef } from "react";

export function DeleteBookingModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { capture: true });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  const cancelRef = useRef<HTMLButtonElement>(null);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/modal z-10 grid place-items-center bg-black/75"
        lockScroll
      >
        <FloatingFocusManager context={context} initialFocus={cancelRef} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full max-w-lg flex-col p-4 outline-hidden"
          >
            <div className="bg-base-200 rounded-box overflow-hidden">
              <div className="flex flex-col p-4 @2xl/modal:p-8">
                {/* Heading and description */}
                <div className="mb-4 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    Confirm deletion
                  </div>
                  <button
                    type="button"
                    className="text-base-content/50 hover:bg-inh-primary-hover/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 flex h-12 w-12 items-center justify-center @lg/export:-mt-6 @lg/export:-mr-6"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-base-content/75 flex flex-row gap-2 text-xl">
                    <p className="flex w-full items-center py-1 font-semibold wrap-anywhere whitespace-pre-wrap">
                      Are you sure you want to delete this booking?
                    </p>
                  </div>

                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      className="bg-inh-primary hover:bg-inh-primary-hover dark:bg-inh-primary-hover dark:hover:bg-inh-primary rounded-box flex w-full items-center justify-center gap-4 px-4 py-2 text-lg font-medium"
                      onClick={() => onOpenChange(false)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="rounded-box flex w-full items-center justify-center gap-2 border-2 border-red-400 bg-red-200 px-4 py-2 text-lg font-medium text-red-900 hover:bg-red-300 dark:border-red-600 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-950"
                      onClick={() => onConfirm()}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
