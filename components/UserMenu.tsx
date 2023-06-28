"use client";
import { useAuthMethods } from "@/lib/auth";
import { useUsersGetMe } from "@/lib/events";
import { useIsClient } from "usehooks-ts";

function UserMenu() {
  const isClient = useIsClient();
  const { data, isLoading, isError } = useUsersGetMe({ query: { retry: 1 } });
  const { signIn, signOut } = useAuthMethods();

  // !isClient - SSR output and during hydration.
  // isError - Error getting the user. Assume not authenticated.
  // isLoading || !data - Request sent but no data yet.
  if (!isClient || isError || isLoading || !data) {
    return <button onClick={signIn}>Sign in</button>;
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-white/75 text-base mr-2">{data.name}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

export default UserMenu;
