import { cn } from "@/lib/ui/cn";

export function EventHeroImage({
  src,
  className,
  children,
}: {
  src?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-base-200 border-base-300 relative aspect-21/9 w-full overflow-hidden rounded-2xl border",
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="text-base-content/20 flex h-full w-full items-center justify-center">
          <span className="icon-[mdi--image-outline] size-16" />
        </div>
      )}
      {children}
    </div>
  );
}
