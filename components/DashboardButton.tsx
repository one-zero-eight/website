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
            className="mt-6 flex justify-center items-center w-32 h-12 bg-focus_color text-white rounded-3xl font-semibold text-xl"
          >
            Sign in
          </Link>
        ) : (
          <Link
            href={signIn}
            className="mt-6 flex justify-center items-center w-32 h-12 bg-base border-focus_color border-2 text-white rounded-3xl font-semibold text-xl"
          >
            Sign in
          </Link>
        )}
      </>
    );
  }
  return (
    <Link
      href={"/dashboard"}
      className="mt-6 flex text-center justify-center items-center w-52 h-14 bg-base border-border border-2 text-white rounded-3xl font-medium text-xl"
    >
      <DashboardIcon width={36} height={36} className="fill-icon-main" />
      Dashboard
    </Link>
  );
}
