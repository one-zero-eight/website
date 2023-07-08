"use client";
import { UserFace } from "@/components/icons/UserFace";
import React from "react";
import { useDarkMode, useIsClient } from "usehooks-ts";

export default function SwitchThemeButton() {
  const isClient = useIsClient();
  const { isDarkMode, toggle } = useDarkMode();
  return (
    <button
      className="flex flex-col justify-center items-center bg-primary-main w-64 lg:w-18p h-18p rounded-2xl ml-4"
      onClick={toggle}
    >
      {isClient && !isDarkMode ? (
        <UserFace className="flex fill-yellow-600" width={36} height={36} />
      ) : (
        <UserFace className="flex fill-violet-500" width={36} height={36} />
      )}
    </button>
  );
}
