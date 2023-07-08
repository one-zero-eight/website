"use client";

import { useDarkMode, useIsClient } from "usehooks-ts";

export default function ThemedHtml({
  children,
  className,
  ...htmlProps
}: {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLHtmlElement>) {
  const isClient = useIsClient();
  const { isDarkMode } = useDarkMode();

  return (
    <html
      {...htmlProps}
      className={`${className}` + (isClient && !isDarkMode ? "" : " dark")}
    >
      {children}
    </html>
  );
}
