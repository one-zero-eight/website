import type { ReactNode } from "react";

export function AboutAsideSection({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:gap-6 [&_p]:mb-4 [&_p:last-child]:mb-0">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex w-full flex-col items-end gap-2 md:w-64 md:shrink-0 md:items-stretch [&_a]:w-full">
        {aside}
      </div>
    </div>
  );
}
