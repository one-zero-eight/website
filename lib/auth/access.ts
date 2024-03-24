import { useLocalStorage } from "usehooks-ts";

const TOKEN_KEY = "accessToken";

export function getMyAccessToken() {
  // Remove quotes as this is stored as JSON
  return localStorage.getItem(TOKEN_KEY)?.slice(1, -1) ?? null;
}

export function invalidateMyAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  // Notify usehooks-ts about the change
  window.dispatchEvent(new StorageEvent("local-storage", { key: TOKEN_KEY }));
}

export function useMyAccessToken() {
  return useLocalStorage<string | null>(TOKEN_KEY, null);
}
