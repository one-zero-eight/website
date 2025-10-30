import { queryClient } from "@/app/query-client.ts";
import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

const TOKEN_KEY = "accessToken";

export function getMyAccessToken() {
  // Remove quotes as this is stored as JSON
  return localStorage.getItem(TOKEN_KEY)?.slice(1, -1) ?? null;
}

export function invalidateMyAccessToken() {
  // Check if the token is already invalid
  const prevToken = getMyAccessToken();
  if (!prevToken) return false;

  localStorage.removeItem(TOKEN_KEY);
  // Notify usehooks-ts about the change
  window.dispatchEvent(new StorageEvent("local-storage", { key: TOKEN_KEY }));
  // Clear the query cache
  queryClient.clear();
  return true;
}

export function useMyAccessToken() {
  return useLocalStorage<string | null>(TOKEN_KEY, null);
}

export function getExpirationDate(accessToken: string | null) {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    if (!payload.exp || typeof payload.exp !== "number") return null;
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

export function checkIsTokenExpired(accessToken: string | null, now: Date) {
  const exp = getExpirationDate(accessToken);
  return exp ? exp <= now : null;
}

export function useIsMyAccessTokenExpired() {
  const [token, _] = useMyAccessToken();
  const [isExpired, setIsExpired] = useState<boolean | null>(null);

  useEffect(() => {
    // Evaluate expiration immediately
    const res = checkIsTokenExpired(token, new Date());
    setIsExpired(res);

    if (res === false) {
      // Set a timer to update expiration status when the token expires
      const timer = setTimeout(
        () => {
          setIsExpired(checkIsTokenExpired(token, new Date()));
        },
        getExpirationDate(token)!.getTime() - Date.now(),
      );
      return () => clearTimeout(timer);
    }
  }, [token]);

  return isExpired;
}
