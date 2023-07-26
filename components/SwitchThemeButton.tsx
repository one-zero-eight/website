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
      className="flex flex-col justify-center items-center bg-primary-main w-18p h-18p rounded-2xl ml-4 hover:bg-primary-hover"
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
