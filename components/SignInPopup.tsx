"use client";
import CloseIcon from "@/components/icons/CloseIcon";
import { useAuthPaths } from "@/lib/auth";
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
import Link from "next/link";
import React, { useRef } from "react";

type PopupProps = {
  header: string;
  description: string;
  isOpen: boolean;
  setIsOpen: (open: boolean, event?: Event) => void;
};

export default function SignInPopup({
  header,
  description,
  isOpen,
  setIsOpen,
}: PopupProps) {
  const { signIn } = useAuthPaths();
  const signInRef = useRef(null);

  const { context, refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  return (
    <>
      {isMounted && (
        <FloatingPortal>
          <FloatingOverlay
            className="z-10 grid place-items-center bg-black/75"
            lockScroll
          >
            <FloatingFocusManager context={context} initialFocus={signInRef}>
              <div
                ref={refs.setFloating}
                style={transitionStyles}
                {...getFloatingProps()}
                className="flex p-4"
              >
                <div className="h-fit max-w-2xl overflow-hidden rounded-xl bg-primary-main">
                  <div className="text-xl font-bold">
                    <div className="flex w-full flex-row">
                      <div className="grow items-center pl-4 pt-6 text-text-main sm:pl-8">
                        {header}
                      </div>
                      <button
                        className="w-fit rounded-2xl fill-icon-main/50 p-4 hover:fill-icon-hover/75"
                        onClick={() => {
                          setIsOpen && setIsOpen(false);
                        }}
                      >
                        <CloseIcon className="w-10" />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 sm:px-8">
                    <div className="text-text-secondary/75">{description}</div>
                    <Link
                      ref={signInRef}
                      href={signIn}
                      className="my-8 flex h-12 w-32 items-center justify-center rounded-3xl bg-focus_color text-xl font-semibold text-white"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </>
  );
}
