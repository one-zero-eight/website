import { useMe } from "@/api/accounts/user.ts";
import { AuthManager } from "@/api/helpers/AuthManager.tsx";
import { PwaPromptProvider } from "@/app/pwa-prompt.tsx";
import { queryClient } from "@/app/query-client.ts";
import { GoogleAnalytics } from "@/lib/tracking/GoogleAnalytics.tsx";
import { UserInfoTracker } from "@/lib/tracking/UserInfoTracker.tsx";
import { YandexMetrika } from "@/lib/tracking/YandexMetrika.tsx";
import { FoundPeopleProvider } from "@/lib/easter-eggs/FoundPeopleContext.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { Register, RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTernaryDarkMode } from "usehooks-ts";

// Root app component
export function App({ router }: { router: Register["router"] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PwaPromptProvider>
        <FoundPeopleProvider>
          <AppRouter router={router} />
        </FoundPeopleProvider>
      </PwaPromptProvider>

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
