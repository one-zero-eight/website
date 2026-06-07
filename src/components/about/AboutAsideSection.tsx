import type { ReactNode } from "react";

export function AboutAsideSection({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col-reverse gap-4 md:block md:flow-root [&_p]:mb-4 [&_p:last-child]:mb-0">
      <div className="flex flex-col items-end gap-2 sm:max-w-xs md:float-right md:mb-0 md:ml-6 md:w-52 md:max-w-none md:items-stretch [&_a]:w-full">
        {aside}
      </div>
      <div>{children}</div>
    </div>
  );
}
