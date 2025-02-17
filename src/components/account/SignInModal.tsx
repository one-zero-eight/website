import { SignInButton } from "@/components/common/SignInButton.tsx";
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

export function SignInModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { capture: true });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  const signInRef = useRef<HTMLButtonElement>(null);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="z-10 grid place-items-center bg-black/75 @container/modal"
        lockScroll
        /* Disallow to propagate the click events */
        onClick={(e) => e.stopPropagation()}
      >
        <FloatingFocusManager context={context} initialFocus={signInRef} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex p-4"
          >
            <div className="h-fit max-w-2xl overflow-hidden rounded-2xl bg-floating">
              <div className="flex flex-col p-4 @lg/modal:p-8">
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    Sign in to get access
                  </div>
                  <button
                    type="button"
                    className="-mr-2 -mt-2 flex h-12 w-12 items-center justify-center rounded-2xl text-contrast/50 hover:bg-primary-hover/50 hover:text-contrast/75 @lg/modal:-mr-6 @lg/modal:-mt-6"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>
                <div className="mb-4 text-contrast/75">
                  Use your Innopolis account to access all features of this
                  service.
                </div>
                <SignInButton ref={signInRef} />
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
