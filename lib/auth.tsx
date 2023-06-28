"use client";
import { EVENTS_API_URL } from "@/lib/events";
import { useRouter } from "next/navigation";

export function useAuthMethods() {
  const router = useRouter();

  return {
    signIn: () => {
      const url = new URL(
        `${EVENTS_API_URL}/auth/${process.env.NEXT_PUBLIC_AUTH_PROVIDER}/login`
      );
      url.searchParams.append("return_to", window.location.href);
      router.push(url.toString());
    },
    signOut: () => {
      const url = new URL(`${EVENTS_API_URL}/auth/logout`);
      url.searchParams.append("return_to", window.location.href);
      router.push(url.toString());
    },
  };
}
