import {
  SearchResponseSource,
  TelegramSource,
} from "@/lib/search/api/__generated__";
import React, { useEffect } from "react";
import "react-pdf/dist/esm/Page/TextLayer.css";
import clsx from "clsx";
import { useTernaryDarkMode } from "usehooks-ts";

export declare type TelegramPreviewProps = {
  source: SearchResponseSource | null;
  searchText: string;
  isOpened: boolean;
  onClose: () => void;
};

export default function TelegramPreview({
  source,
  searchText,
  isOpened,
  onClose,
}: TelegramPreviewProps) {
  const { isDarkMode, setTernaryDarkMode } = useTernaryDarkMode({
    defaultValue: "dark",
    initializeWithValue: true,
    localStorageKey: "theme",
  });

  useEffect(() => {
    if (isOpened) {
      // Create a new script element
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute(
        "data-telegram-post",
        source!.link.split("https://t.me/")[1],
      );
      script.setAttribute("data-width", "100%");
      if (isDarkMode) {
        script.setAttribute("data-dark", "1");
      }

      // Append the script to the container
      const container = document.getElementById("telegram-widget-container");
      if (container) {
        container.innerHTML = ""; // Clear any previous script
        container.appendChild(script);
      }

      // Cleanup script when component unmounts or source changes
      return () => {
        if (container) {
          container.innerHTML = "";
        }
      };
    }
  }, [isOpened, source, isDarkMode]);

  return (
    <div
      className={clsx(
        "flex h-fit max-h-full min-w-0 flex-col gap-2 rounded-lg border border-default bg-sidebar p-4 md:basis-1/2",
        isOpened
          ? "fixed inset-8 top-8 z-10 md:visible md:static"
          : "invisible w-0",
      )}
    >
      <div className="flex flex-row items-center justify-between">
        <p className="text-2xl font-semibold text-base-content dark:text-white">
          {(source as TelegramSource).display_name}
        </p>
        <span
          className="icon-[material-symbols--close] text-2xl md:invisible"
          onClick={onClose}
        />
      </div>
      <a href={(source as TelegramSource).link} className="w-fit max-w-full">
        <p className="truncate pb-3 text-xs font-normal text-breadcrumbs hover:underline">
          {(source as TelegramSource).breadcrumbs.join(" > ")}
        </p>
      </a>

      <div
        id="telegram-widget-container"
        className="custom-preview-scrollbar overflow-auto rounded-lg shadow-lg"
      ></div>
    </div>
  );
}
