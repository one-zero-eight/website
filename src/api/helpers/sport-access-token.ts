import { queryClient } from "@/app/query-client.ts";
import { useLocalStorage } from "usehooks-ts";

const TOKEN_KEY = "accessTokenSport";

export function getMySportAccessToken() {
  // Remove quotes as this is stored as JSON
  return localStorage.getItem(TOKEN_KEY)?.slice(1, -1) ?? null;
}

export function invalidateMySportAccessToken() {
  // Check if the token is already invalid
  const prevToken = getMySportAccessToken();
  if (!prevToken) return false;

  localStorage.removeItem(TOKEN_KEY);
  // Notify usehooks-ts about the change
  window.dispatchEvent(new StorageEvent("local-storage", { key: TOKEN_KEY }));
  // Clear the query cache
  queryClient.clear();
  return true;
}

export function useMySportAccessToken() {
  return useLocalStorage<string | null>(TOKEN_KEY, null);
}
