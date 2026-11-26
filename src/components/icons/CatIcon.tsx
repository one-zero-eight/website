import type { CatMood } from "@/components/search/ask/ask-mood";
import { cn } from "@/lib/ui/cn";

// The cAtIx mascot; the drawings are public/catix-cat.svg and public/catix-cat-<mood>.svg
export function CatIcon({
  className,
  title,
  mood = "idle",
}: {
  className?: string;
  title?: string;
  mood?: CatMood;
}) {
  return (
    <img
      src={mood === "idle" ? "/catix-cat.svg" : `/catix-cat-${mood}.svg`}
      alt=""
      title={title}
      className={cn("size-6 shrink-0", className)}
    />
  );
}
