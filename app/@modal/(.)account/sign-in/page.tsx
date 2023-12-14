"use client";
import SignInButton from "@/components/SignInButton";
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
import { useRouter, useSearchParams } from "next/navigation";
import React, { useRef } from "react";

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const signInRef = useRef(null);

  const { context, refs } = useFloating({
    open: true,
    onOpenChange: () => router.back(),
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
                <div className="h-fit max-w-2xl overflow-hidden rounded-2xl bg-primary-main">
                  <div className="flex flex-col p-4 lg:p-8">
                    <div className="flex w-full flex-row">
                      <div className="grow items-center text-3xl font-semibold">
                        {searchParams.get("header") || "Sign in to get access"}
                      </div>
                      <button
                        className="-mr-4 -mt-4 rounded-2xl p-4 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75 lg:-mr-8 lg:-mt-8"
                        onClick={() => router.back()}
                      >
                        <span className="icon-[material-symbols--close] text-4xl" />
                      </button>
                    </div>
                    <div className="mb-4 text-text-secondary/75">
                      {searchParams.get("header") ||
                        "Use your Innopolis account to access all features of this service."}
                    </div>
                    <SignInButton ref={signInRef} />
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
