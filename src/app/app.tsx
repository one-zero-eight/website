import "./styles.css";

import { queryClient } from "@/app/query-client.ts";
import { AuthManager } from "@/lib/auth/AuthManager.tsx";
import { useMe } from "@/lib/auth/user.ts";
import { GoogleAnalytics } from "@/lib/tracking/GoogleAnalytics.tsx";
import { UserInfoTracker } from "@/lib/tracking/UserInfoTracker.tsx";
import { YandexMetrika } from "@/lib/tracking/YandexMetrika.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { Register, RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTernaryDarkMode } from "usehooks-ts";

// Root app component
export function App({ router }: { router: Register["router"] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter router={router} />

      <YandexMetrika />
      <GoogleAnalytics />
      <UserInfoTracker />
      <ThemeChanger />
      <AuthManager />
    </QueryClientProvider>
  );
}

// Router provider with context values
function AppRouter({ router }: { router: Register["router"] }) {
  const { me } = useMe();
  return <RouterProvider router={router} context={{ isAuthenticated: !!me }} />;
}

// Helper to change the theme class in <html> element
function ThemeChanger() {
  const { isDarkMode } = useTernaryDarkMode({
    defaultValue: "dark",
    initializeWithValue: true,
    localStorageKey: "theme",
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);
  return null;
}
