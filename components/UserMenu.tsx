"use client";
import { useAuthMethods } from "@/lib/auth";
import { useUsersGetMe } from "@/lib/events";
import { useIsClient } from "usehooks-ts";
import React from "react";
import { Popover, Transition } from "@headlessui/react";
import { UserFace } from "@/components/icons/UserFace";

type UserMenuProps = {
  isMobile: boolean;
  isSidebar: boolean;
};
function UserMenu({ isMobile, isSidebar }: UserMenuProps) {
  const isClient = useIsClient();
  const { data, isLoading, isError } = useUsersGetMe();
  const { signIn, signOut } = useAuthMethods();

  // !isClient - SSR output and during hydration.
  // isError - Error getting the user. Assume not authenticated.
  // !data - Request sent but no data yet.
  if (!isClient || isError || !data) {
    return (
      <button
        className="w-32 h-12 bg-focus_color rounded-3xl font-semibold text-xl"
        onClick={signIn}
      >
        Sign in
      </button>
    );
  }

  return (
    <Popover className="relative focus:outline-none">
      <Popover.Button className="focus:outline-none">
        <div className="flex flex-col justify-center items-center bg-light_primary dark:bg-primary w-64 lg:w-18p h-18p rounded-2xl ml-auto">
          <div className="flex shrink-0 w-12 h-12 bg-light_border dark:bg-border rounded-full justify-center items-center">
            <UserFace
              className="flex fill-light_icon dark:fill-icon"
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
          className={
            isMobile
              ? "bg-light_primary dark:bg-primary w-64 h-16 rounded-2xl border-border/50 border-2 absolute top-[18p] left-0 z-10 opacity-[0.999]"
              : isSidebar
              ? "bg-light_primary dark:bg-primary w-64 h-16 rounded-2xl border-border/50 border-2 absolute -top-32 z-10 opacity-[0.999]"
              : "bg-light_primary dark:bg-primary w-64 h-16 rounded-2xl border-border/50 border-2 absolute top-[18p] right-0 z-10 opacity-[0.999]"
          }
        >
          <div className="flex top-1/2 justify-center ml-auto mr-auto left-0 right-0 w-64 h-16">
            <Popover.Button>
              {() => (
                <div
                  className="flex justify-center items-center text-center text-light_text dark:text-text bg-light_border dark:bg-border w-56 h-10 rounded-2xl"
                  onClick={signOut}
                >
                  Sign out
                </div>
              )}
            </Popover.Button>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}

export default UserMenu;
