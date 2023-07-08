"use client";
import { UserFace } from "@/components/icons/UserFace";
import { useAuthMethods } from "@/lib/auth";
import { useUsersGetMe } from "@/lib/events";
import { Popover, Transition } from "@headlessui/react";
import Link from "next/link";
import React from "react";
import { useIsClient } from "usehooks-ts";

type UserMenuProps = {
  isMobile: boolean;
  isSidebar: boolean;
};
function UserMenu({ isMobile, isSidebar }: UserMenuProps) {
  const isClient = useIsClient();
  const { data, isLoading, isError } = useUsersGetMe();
  const { signIn, signOut } = useAuthMethods();

  // !isClient - SSR output and during hydration.
  if (!isClient) {
    return <></>;
  }

  // isError - Error getting the user. Assume not authenticated.
  // !data - Request sent but no data yet.
  if (isError || !data) {
    return (
      <button
        className="w-32 h-12 bg-focus_color text-white rounded-3xl font-semibold text-xl"
        onClick={signIn}
      >
        Sign in
      </button>
    );
  }

  return (
    <Popover className="relative focus:outline-none">
      <Popover.Button className="focus:outline-none">
        <div className="flex flex-col justify-center items-center bg-primary-main w-64 lg:w-18p h-18p rounded-2xl ml-auto">
          <div className="flex shrink-0 w-12 h-12 bg-border rounded-full justify-center items-center">
            <UserFace
              className="flex fill-icon-main/50"
              width={36}
              height={36}
            />
          </div>
        </div>
      </Popover.Button>
      <Transition
        enter="transition duration-120 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-125 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Popover.Panel
          className={`bg-primary-main p-4 rounded-2xl border-border/50 border-2 absolute z-10 opacity-[0.999] ${
            isMobile
              ? "top-[18p] left-0"
              : isSidebar
              ? "-top-32"
              : "top-[18p] right-0"
          }`}
        >
          <div className="justify-center sm:justify-normal flex flex-row gap-6">
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="text-text-main bg-border px-6 py-2 rounded-2xl w-full text-center whitespace-nowrap"
              >
                My dashboard
              </Link>
              <div
                className="text-text-main bg-border px-6 py-2 rounded-2xl w-full text-center whitespace-nowrap cursor-pointer"
                onClick={signOut}
              >
                Sign out
              </div>
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}

export default UserMenu;
