"use client";
import { SidebarContext } from "@/components/Sidebar";
import { SignInButtonIcon } from "@/components/SignInButton";
import { useAuthPaths } from "@/lib/auth";
import { useUsersGetMe } from "@/lib/events";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import clsx from "clsx";
import Link from "next/link";
import React, { useContext, useState } from "react";
import { useIsClient } from "usehooks-ts";

type UserMenuProps = {
  isMobile: boolean;
  isSidebar: boolean;
};
function UserMenu({ isMobile, isSidebar }: UserMenuProps) {
  const isClient = useIsClient();
  const { data, isError } = useUsersGetMe();
  const { signOut } = useAuthPaths();
  const [isOpen, setIsOpen] = useState(false);
  const { setOpened: setSidebarOpened } = useContext(SidebarContext);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    placement: "bottom-end",
    middleware: [offset(0), flip(), shift()],
  });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const click = useClick(context);
  const dismiss = useDismiss(context);
  // Role props for screen readers
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // !isClient - SSR output and during hydration.
  // isError - Error getting the user. Assume not authenticated.
  // !data - Request sent but no data yet.
  if (!isClient || isError || !data) {
    return (
      <SignInButtonIcon
        onClick={() => {
          setIsOpen(false);
          setSidebarOpened(false);
        }}
      />
    );
  }

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="rounded-2xl hover:bg-primary-hover"
      >
        <div className="ml-auto flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-icon-main/50">
            <span className="icon-[material-symbols--snowboarding-rounded] text-4xl" />
          </div>
        </div>
      </button>

      {isMounted && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, ...transitionStyles }}
              {...getFloatingProps()}
              className={clsx(
                "absolute z-10 w-fit rounded-2xl border-2 border-border/50 bg-primary-main p-4",
                isMobile
                  ? "left-0 top-[18p]"
                  : isSidebar
                    ? "-top-32"
                    : "right-0 top-[18p]",
              )}
            >
              <div className="flex flex-row justify-center gap-6 sm:justify-normal">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-border text-icon-main/50">
                  <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex h-20 flex-col justify-center">
                    <p className="text-xl text-text-main">{data?.name} </p>
                    <p className="text-sm text-text-secondary/75">
                      {data?.email}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => {
                      setIsOpen(false);
                      setSidebarOpened(false);
                    }}
                    className="flex w-full flex-row items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-border px-6 py-2 text-center text-text-main/75 hover:bg-border-hover"
                  >
                    <span className="icon-[material-symbols--account-circle] text-2xl" />
                    My dashboard
                  </Link>
                  <Link
                    href={signOut}
                    onClick={() => {
                      setIsOpen(false);
                      setSidebarOpened(false);
                    }}
                    className="flex w-full cursor-pointer flex-row items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-secondary-main px-6 py-2 text-center text-text-main/75 hover:bg-secondary-hover"
                  >
                    <span className="icon-[material-symbols--logout] text-2xl" />
                    Sign out
                  </Link>
                </div>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

export default UserMenu;
