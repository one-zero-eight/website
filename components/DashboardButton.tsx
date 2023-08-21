"use client";
import { useAuthPaths } from "@/lib/auth";
import Link from "next/link";
import React from "react";
import { useIsClient, useWindowSize } from "usehooks-ts";
import { useUsersGetMe } from "@/lib/events";
import DashboardIcon from "@/components/icons/DashboardIcon";

export function DashboardButton() {
  const { width } = useWindowSize();
  const { signIn } = useAuthPaths();
  const isClient = useIsClient();
  const { data, isError } = useUsersGetMe();
  if (!isClient) return <></>;
  if (isError || !data) {
    return (
      <>
        {width < 1024 ? (
          <Link
            href={signIn}
            className="mt-6 flex h-12 w-32 items-center justify-center rounded-3xl bg-focus_color text-xl font-semibold text-white"
          >
            Sign in
          </Link>
        ) : (
          <Link
            href={signIn}
            className="mt-6 flex h-12 w-32 items-center justify-center rounded-3xl border-2 border-focus_color bg-base text-xl font-semibold text-text-main"
          >
            Sign in
          </Link>
        )}
      </>
    );
  }
  return (
    <Link
      id="schedule-dashboard-button"
      href={"/dashboard"}
      className="mt-6 flex h-14 w-52 items-center justify-center rounded-3xl border-2 border-border bg-base text-center text-xl font-medium text-text-main"
    >
      <DashboardIcon width={36} height={36} className="fill-icon-main" />
      Dashboard
    </Link>
  );
}
