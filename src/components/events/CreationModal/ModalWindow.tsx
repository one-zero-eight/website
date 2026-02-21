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

export function ModalWindow({
  open,
  onOpenChange,
  children,
  className = "",
  title,
  closeOutsidePress = false,
}: {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  closeOutsidePress?: boolean;
}) {
  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePress: closeOutsidePress });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/modal z-10 grid place-items-center bg-black/75"
        lockScroll
      >
        <FloatingFocusManager context={context} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full max-w-[90vw] flex-col outline-hidden sm:max-w-xl"
          >
            <div className="bg-base-200 rounded-box overflow-hidden">
              <div
                className={`flex min-w-0 flex-col gap-2 p-5 @2xl/modal:p-6 ${className}`}
              >
                {/* Heading and close button */}
                <div className="mb-0 flex w-full flex-row">
                  {title && (
                    <div className="grow items-center overflow-hidden pr-2 text-2xl font-semibold wrap-break-word">
                      {title}
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-base-content/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 flex h-10 w-10 items-center justify-center outline-white dark:outline-black"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-2xl" />
                  </button>
                </div>

                {children}
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
