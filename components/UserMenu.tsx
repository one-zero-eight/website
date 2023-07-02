"use client";
import { useAuthMethods } from "@/lib/auth";
import { useUsersGetMe } from "@/lib/events";
import { useIsClient } from "usehooks-ts";
import React from "react";

function UserMenu() {
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
    <div className="flex flex-col justify-center items-center bg-background w-18p h-18p rounded-2xl ml-auto">
      <div className="flex shrink-0 w-12 h-12 bg-gray-600 rounded-full border-border border-2" />
    </div>
  );
}

export default UserMenu;
