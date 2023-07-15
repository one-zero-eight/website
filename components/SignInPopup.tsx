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
            className="z-10 bg-black/75 place-items-center grid"
            lockScroll
          >
            <FloatingFocusManager context={context} initialFocus={signInRef}>
              <div
                ref={refs.setFloating}
                style={transitionStyles}
                {...getFloatingProps()}
                className="flex p-4"
              >
                <div className="max-w-2xl h-fit rounded-xl bg-primary-main overflow-hidden">
                  <div className="text-xl font-bold">
                    <div className="flex flex-row w-full">
                      <div className="text-text-main grow items-center pl-4 sm:pl-8 pt-6">
                        {header}
                      </div>
                      <button
                        className="rounded-xl w-fit p-4"
                        onClick={() => {
                          close && close();
                        }}
                      >
                        <CloseIcon className="fill-icon-main/50 hover:fill-icon_hover w-10" />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 sm:px-8">
                    <div className="text-text-secondary/75">{description}</div>
                    <Link
                      ref={signInRef}
                      href={signIn}
                      className="my-8 flex justify-center items-center w-32 h-12 bg-focus_color text-white rounded-3xl font-semibold text-xl"
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
