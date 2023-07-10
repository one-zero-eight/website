"use client";
import { AccountIcon } from "@/components/icons/AccountIcon";
import { ExitIcon } from "@/components/icons/ExitIcon";
import { UserFace } from "@/components/icons/UserFace";
import { useAuthPaths } from "@/lib/auth";
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
  const { signIn, signOut } = useAuthPaths();

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
        className="mt-3 flex justify-center items-center w-32 h-12 bg-focus_color text-white rounded-3xl font-semibold text-xl"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Popover className="relative focus:outline-none">
      <Popover.Button className="rounded-2xl hover:bg-primary-hover">
        <div className="flex flex-col justify-center items-center bg-primary-main w-64 lg:w-18p h-18p rounded-2xl ml-auto hover:bg-primary-hover">
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
            <div className="flex bg-border shrink-0 w-20 h-20 rounded-full justify-center items-center">
              <UserFace
                className="flex fill-icon-main/50"
                width={48}
                height={48}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col justify-center h-20">
                <p className="text-text-main text-xl">{data?.name} </p>
                <p className="text-sm text-text-secondary/75">{data?.email}</p>
              </div>
              <Link
                href="/dashboard"
                className="flex flex-row justify-center items-center gap-2 text-text-main/75 bg-border hover:bg-border-hover px-6 py-2 rounded-2xl w-full text-center whitespace-nowrap"
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
                className="flex flex-row justify-center items-center gap-2 text-text-main/75 bg-secondary-main hover:bg-secondary-hover px-6 py-2 rounded-2xl w-full text-center whitespace-nowrap cursor-pointer"
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
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}

export default UserMenu;
