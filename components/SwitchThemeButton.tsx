"use client";
import { DarkModeIcon } from "@/components/icons/DarkModeIcon";
import { LightModeIcon } from "@/components/icons/LightModeIcon";
import React from "react";
import { useDarkMode, useIsClient } from "usehooks-ts";

export default function SwitchThemeButton() {
  const isClient = useIsClient();
  const { isDarkMode, toggle } = useDarkMode();
  return (
    <button
      className="ml-4 flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover"
      onClick={toggle}
    >
      {isClient && !isDarkMode ? (
        <LightModeIcon className="flex fill-[#F0B132]" width={36} height={36} />
      ) : (
        <DarkModeIcon
          className="flex fill-focus_color"
          width={36}
          height={36}
        />
      )}
    </button>
  );
}
