import { useTernaryDarkMode } from "usehooks-ts";

export function useTheme() {
  return useTernaryDarkMode({
    defaultValue: "system",
    initializeWithValue: true,
    localStorageKey: "theme-v2",
  });
}
