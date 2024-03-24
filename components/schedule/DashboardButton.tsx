"use client";
import SignInButton from "@/components/common/SignInButton";
import { useMe } from "@/lib/auth/user";
import Link from "next/link";

export function DashboardButton() {
  const { me } = useMe();

  if (!me) {
    return <SignInButton />;
  }

  return (
    <Link
      href={"/dashboard"}
      className="flex items-center gap-2 rounded-2xl border-2 border-border bg-base px-4 py-2 text-xl font-medium hover:bg-primary-main"
    >
      <span className="icon-[material-symbols--space-dashboard-outline] text-4xl" />
      Dashboard
    </Link>
  );
}
