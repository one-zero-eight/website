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
}: {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}) {
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
        className="@container/modal z-10 grid place-items-center bg-black/75"
        lockScroll
      >
        <FloatingFocusManager context={context} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full max-w-xl flex-col p-4 outline-hidden"
          >
            <div className="bg-floating overflow-hidden rounded-2xl">
              <div
                className={`flex min-w-0 flex-col p-4 @2xl/modal:p-8 ${className}`}
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
                    className="text-contrast/50 hover:bg-primary-hover/50 hover:text-contrast/75 -mt-2 -mr-2 flex h-12 w-12 items-center justify-center rounded-2xl"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
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
