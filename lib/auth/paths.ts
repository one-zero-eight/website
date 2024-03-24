"use client";
import { useIsClient } from "usehooks-ts";

export function useAuthPaths(signInRedirect?: string) {
  const isClient = useIsClient();
  const currentURL = isClient ? window.location.href : "/";

  const loginEndpoint = `${process.env.NEXT_PUBLIC_ACCOUNTS_API_URL}/providers/${process.env.NEXT_PUBLIC_AUTH_PROVIDER}/login`;
  const signInURL = new URL(loginEndpoint);
  signInURL.searchParams.append(
    "redirect_uri",
    signInRedirect ?? (isClient ? `${window.location.origin}/dashboard` : "/"),
  );

  const logoutEndpoint = `${process.env.NEXT_PUBLIC_ACCOUNTS_API_URL}/logout`;
  const signOutURL = new URL(logoutEndpoint);
  signOutURL.searchParams.append("redirect_uri", currentURL);

  return {
    signIn: signInURL.toString(),
    signOut: signOutURL.toString(),
  };
}
