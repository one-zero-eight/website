"use client";
import { useAuthMethods } from "@/lib/auth";
import { useUsersGetMe } from "@/lib/events";
import { useIsClient } from "usehooks-ts";

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
    <div className="flex flex-col items-center">
      <p className="text-white/75 text-base">{data.name}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

export default UserMenu;
