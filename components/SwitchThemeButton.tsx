"use client";
import { DarkModeIcon } from "@/components/icons/DarkModeIcon";
import { LightModeIcon } from "@/components/icons/LightModeIcon";
import React from "react";
import { useDarkMode } from "usehooks-ts";

export default function SwitchThemeButton() {
  const { toggle } = useDarkMode();
  return (
    <button
      className="flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover"
      onClick={toggle}
    >
      <LightModeIcon
        className="flex fill-[#F0B132] dark:hidden"
        width={36}
        height={36}
      />
      <DarkModeIcon
        className="hidden fill-focus_color dark:flex"
        width={36}
        height={36}
      />
    </button>
  );
}
