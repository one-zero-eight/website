"use client";

import clsx from "clsx";
import { useIsClient, useTernaryDarkMode } from "usehooks-ts";

export default function ThemedHtml({
  children,
  className,
  ...htmlProps
}: {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLHtmlElement>) {
  const isClient = useIsClient();
  const { isDarkMode } = useTernaryDarkMode({
    defaultValue: "dark",
    initializeWithValue: true,
    localStorageKey: "theme",
  });

  return (
    <html
      {...htmlProps}
      className={clsx(className, (!isClient || isDarkMode) && "dark")}
    >
      <head>
        <script
          // Hack to set dark mode quickly, before hydration finishes
          dangerouslySetInnerHTML={{
            __html: `(function(){if (localStorage.getItem("theme") === '"light"' || (localStorage.getItem("theme") === null && !window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.remove("dark")})()`,
          }}
        />
      </head>
      {children}
    </html>
  );
}
