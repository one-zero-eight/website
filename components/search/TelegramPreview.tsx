import { search } from "@/lib/search";
import { useEffect, useRef } from "react";
import { useTernaryDarkMode } from "usehooks-ts";

export declare type TelegramPreviewProps = {
  source: search.TelegramSource;
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
    if (ref.current !== null) {
      ref.current.innerHTML = ""; // Clear any previous script
      ref.current.appendChild(script);
    }

    // Cleanup script when component unmounts or source changes
    return () => {
      if (ref.current !== null) {
        ref.current.innerHTML = "";
      }
    };
  }, [isDarkMode]);

  return (
    <div
      ref={ref}
      className="custom-preview-scrollbar overflow-auto rounded-lg shadow-lg"
    />
  );
}
