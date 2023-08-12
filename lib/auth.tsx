"use client";
import { EVENTS_API_URL } from "@/lib/events";
import { useIsClient } from "usehooks-ts";

export function useAuthPaths() {
  const isClient = useIsClient();
  const currentURL = isClient ? window.location.href : "/";

  const loginEndpoint = `${EVENTS_API_URL}/auth/${process.env.NEXT_PUBLIC_AUTH_PROVIDER}/login`;
  const signInURL = new URL(loginEndpoint);
  signInURL.searchParams.append(
    "return_to",
    isClient ? `${window.location.origin}/dashboard` : "/",
  );

  const logoutEndpoint = `${EVENTS_API_URL}/auth/logout`;
  const signOutURL = new URL(logoutEndpoint);
  signOutURL.searchParams.append("return_to", currentURL);

  return {
    signIn: signInURL.toString(),
    signOut: signOutURL.toString(),
  };
}
