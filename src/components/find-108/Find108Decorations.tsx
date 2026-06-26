import {
  FIND108_DOTTED_V,
  FIND108_LINE,
} from "@/components/find-108/find108-theme.ts";
import { cn } from "@/lib/ui/cn";

/** Side column width: matches `left-6` + `w-6` rail placement. */
export const FIND108_SIDE_COLUMN = "sm:grid-cols-[3rem_minmax(0,1fr)_3rem]";

function Find108SideRailMarker() {
  return <span className="text-sm text-white/50">+</span>;
}

function Find108SideRail({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 hidden w-6 flex-col items-center sm:flex",
        side === "left" ? "left-6" : "right-6",
      )}
    >
      <Find108SideRailMarker />
      <div className={cn("my-2 h-16", FIND108_DOTTED_V)} />
      <div className={cn("w-px grow border-l-2", FIND108_LINE)} />
      <div className={cn("my-2 h-16", FIND108_DOTTED_V)} />
      <Find108SideRailMarker />
    </div>
  );
}

export function Find108SideRails() {
  return (
    <>
      <Find108SideRail side="left" />
      <Find108SideRail side="right" />
    </>
  );
}
