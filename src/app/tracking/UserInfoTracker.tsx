import { useMe } from "@/api/accounts/user.ts";
import { ymUserParams, ymVisitParams } from "@/app/tracking/YandexMetrika.tsx";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ui/use-theme.ts";

type PWADisplayMode =
  | "twa"
  | "browser"
  | "standalone"
  | "minimal-ui"
  | "fullscreen"
  | "window-controls-overlay"
  | "unknown";

function getPWADisplayMode(): PWADisplayMode {
  if (document.referrer.startsWith("android-app://")) {
    return "twa";
  }
  if (window.matchMedia("(display-mode: browser)").matches) {
    return "browser";
  }
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }
  if (window.matchMedia("(display-mode: minimal-ui)").matches) {
    return "minimal-ui";
  }
  if (window.matchMedia("(display-mode: fullscreen)").matches) {
    return "fullscreen";
  }
  if (window.matchMedia("(display-mode: window-controls-overlay)").matches) {
    return "window-controls-overlay";
  }

  return "unknown";
}

export function UserInfoTracker() {
  const { me } = useMe();

  const { isDarkMode } = useTheme();

  const [pwaDisplayMode, setPwaDisplayMode] =
    useState<PWADisplayMode>("unknown");

  useEffect(() => {
    const displayModeQueries = [
      window.matchMedia("(display-mode: browser)"),
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: minimal-ui)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(display-mode: window-controls-overlay)"),
    ];

    const handleDisplayModeChange = () => {
      setPwaDisplayMode(getPWADisplayMode());
    };

    handleDisplayModeChange();
    displayModeQueries.forEach((query) => {
      query.addEventListener("change", handleDisplayModeChange);
    });

    return () => {
      displayModeQueries.forEach((query) => {
        query.removeEventListener("change", handleDisplayModeChange);
      });
    };
  }, []);

  // Send user info to Yandex Metrika
  useEffect(() => {
    if (me) {
      ymUserParams({
        UserID: me.id,
        email: me.innopolis_info?.email,
        name: me.innopolis_info?.name,
      });
    }
  }, [me]);

  // Send visit info
  useEffect(() => {
    ymVisitParams({
      theme: isDarkMode ? "dark" : "light",
      pwa: pwaDisplayMode !== "browser" && pwaDisplayMode !== "unknown",
      display_mode: pwaDisplayMode,
    });
  }, [isDarkMode, pwaDisplayMode]);

  return null;
}
