"use client";
import { AccountIcon } from "@/components/icons/AccountIcon";
import { ExitIcon } from "@/components/icons/ExitIcon";
import { UserFace } from "@/components/icons/UserFace";
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
import Link from "next/link";
import React, { useState } from "react";
import { useIsClient } from "usehooks-ts";

type UserMenuProps = {
  isMobile: boolean;
  isSidebar: boolean;
};
function UserMenu({ isMobile, isSidebar }: UserMenuProps) {
  const isClient = useIsClient();
  const { data, isError } = useUsersGetMe();
  const { signIn, signOut } = useAuthPaths();
  const [isOpen, setIsOpen] = useState(false);

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
  if (!isClient) {
    return <></>;
  }

  // isError - Error getting the user. Assume not authenticated.
  // !data - Request sent but no data yet.
  if (isError || !data) {
    return (
      <Link
        href={signIn}
        className="mt-3 flex h-12 w-32 items-center justify-center rounded-3xl bg-focus_color text-xl font-semibold text-white"
      >
        Sign in
      </Link>
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-border">
            <UserFace
              className="flex fill-icon-main/50"
              width={36}
              height={36}
            />
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
              className={`absolute z-10 w-fit rounded-2xl border-2 border-border/50 bg-primary-main p-4 opacity-[0.999] ${
                isMobile
                  ? "left-0 top-[18p]"
                  : isSidebar
                  ? "-top-32"
                  : "right-0 top-[18p]"
              }`}
            >
              <div className="flex flex-row justify-center gap-6 sm:justify-normal">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-border">
                  <UserFace
                    className="flex fill-icon-main/50"
                    width={48}
                    height={48}
                  />
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
                    className="flex w-full flex-row items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-border px-6 py-2 text-center text-text-main/75 hover:bg-border-hover"
                  >
                    <AccountIcon
                      width={26}
                      height={26}
                      className={"flex fill-text-main/75"}
                    />
                    My dashboard
                  </Link>
                  <Link
                    href={signOut}
                    className="flex w-full cursor-pointer flex-row items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-secondary-main px-6 py-2 text-center text-text-main/75 hover:bg-secondary-hover"
                  >
                    <ExitIcon
                      width={26}
                      height={26}
                      className={"flex fill-text-main/75"}
                    />
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
