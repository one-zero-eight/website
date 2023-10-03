"use client";
import DashboardIcon from "@/components/icons/DashboardIcon";
import SignInButton from "@/components/SignInButton";
import { useUsersGetMe } from "@/lib/events";
import Link from "next/link";

export function DashboardButton() {
  const { data, isError } = useUsersGetMe();

  if (isError || !data) {
    return <SignInButton />;
  }

  return (
    <Link
      href={"/dashboard"}
      className="flex items-center justify-center rounded-2xl border-2 border-border bg-base px-4 py-2 text-center text-xl font-medium hover:bg-primary-main"
    >
      <DashboardIcon width={36} height={36} className="fill-icon-main" />
      Dashboard
    </Link>
  );
}
