"use client";
import { usePathname } from "next/navigation";
import { useIsClient } from "usehooks-ts";

export function useAuthPaths(signInRedirect?: string) {
  const isClient = useIsClient();
  const pathname = usePathname();
  const origin = isClient ? window.location.origin : "";

  const loginEndpoint = `${process.env.NEXT_PUBLIC_ACCOUNTS_API_URL}/providers/${process.env.NEXT_PUBLIC_AUTH_PROVIDER}/login`;
  const signInURL = new URL(loginEndpoint);
  signInURL.searchParams.append(
    "redirect_uri",
    new URL(signInRedirect || "/dashboard", origin).toString(),
  );

  const logoutEndpoint = `${process.env.NEXT_PUBLIC_ACCOUNTS_API_URL}/logout`;
  const signOutURL = new URL(logoutEndpoint);
  signOutURL.searchParams.append(
    "redirect_uri",
    new URL(pathname, origin).toString(),
  );

  return {
    signIn: signInURL.toString(),
    signOut: signOutURL.toString(),
  };
}
