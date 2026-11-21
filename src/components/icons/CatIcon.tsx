import { cn } from "@/lib/ui/cn";

// The cAtIx mascot; the same drawing as public/catix-cat.svg
export function CatIcon({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <img
      src="/catix-cat.svg"
      alt=""
      title={title}
      className={cn("size-6 shrink-0", className)}
    />
  );
}
