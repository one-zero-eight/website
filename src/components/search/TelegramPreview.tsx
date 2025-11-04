import { searchTypes } from "@/api/search";
import { useEffect, useRef } from "react";
import { useTernaryDarkMode } from "usehooks-ts";

export declare type TelegramPreviewProps = {
  source: searchTypes.SchemaTelegramSource;
};

export default function TelegramPreview({ source }: TelegramPreviewProps) {
  const { isDarkMode } = useTernaryDarkMode({
    defaultValue: "dark",
    initializeWithValue: true,
    localStorageKey: "theme",
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create a new script element
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute(
      "data-telegram-post",
      source.link.split("https://t.me/")[1],
    );
    script.setAttribute("data-width", "100%");
    if (isDarkMode) {
      script.setAttribute("data-dark", "1");
    }

    // Append the script to the container
    const container = ref.current;
    if (container !== null) {
      container.innerHTML = ""; // Clear any previous script
      container.appendChild(script);
    }

    // Cleanup script when component unmounts or source changes
    return () => {
      if (container !== null) {
        container.innerHTML = "";
      }
    };
  }, [isDarkMode, source.link]);

  return <div ref={ref} className="rounded-field overflow-auto shadow-lg" />;
}
