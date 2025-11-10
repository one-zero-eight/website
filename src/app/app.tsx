import { useMe } from "@/api/accounts/user.ts";
import { AuthManager } from "@/api/helpers/AuthManager.tsx";
import { PwaPromptProvider } from "@/app/pwa-prompt.tsx";
import { queryClient } from "@/app/query-client.ts";
import { GoogleAnalytics } from "@/app/tracking/GoogleAnalytics.tsx";
import { UserInfoTracker } from "@/app/tracking/UserInfoTracker.tsx";
import { YandexMetrika } from "@/app/tracking/YandexMetrika.tsx";
import { ToastContainer, ToastProvider } from "@/components/toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { Register, RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTernaryDarkMode } from "usehooks-ts";

// Root app component
export function App({ router }: { router: Register["router"] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PwaPromptProvider>
        <ToastProvider>
          <AppRouter router={router} />
          <ToastContainer />
        </ToastProvider>
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
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);
  return null;
}
