"use client";

import clsx from "clsx";
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
  const isSafari =
    isClient && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <html
      {...htmlProps}
      className={clsx(
        className,
        (!isClient || isDarkMode) && "dark",
        !isSafari && "snow",
      )}
    >
      {children}
    </html>
  );
}
