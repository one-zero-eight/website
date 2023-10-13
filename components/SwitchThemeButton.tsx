"use client";
import React from "react";
import { useDarkMode } from "usehooks-ts";

export default function SwitchThemeButton() {
  const { toggle } = useDarkMode();
  return (
    <button
      className="flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover"
      onClick={toggle}
    >
      <span className="icon-[material-symbols--light-mode-outline] flex text-4xl text-[#F0B132] dark:hidden" />
      <span className="icon-[material-symbols--dark-mode-outline] hidden text-4xl text-focus_color dark:flex" />
    </button>
  );
}
