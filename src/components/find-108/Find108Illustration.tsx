import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

export const FIND108_ILLUSTRATION_SVG_CLASS = "h-full w-auto text-white";

export function Find108Illustration({
  side,
  children,
}: {
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto mb-4 block h-[min(50rem,34vw)] w-fit sm:mx-0 sm:mb-2 sm:h-[10rem]",
        side === "left" ? "sm:float-left sm:mr-4" : "sm:float-right sm:ml-4",
      )}
    >
      {children}
    </div>
  );
}
