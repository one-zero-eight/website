import { cn } from "@/lib/ui/cn";

export function EventPageLayout({
  hero,
  main,
  side,
  className,
}: {
  hero: React.ReactNode;
  main: React.ReactNode;
  side: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("@container/content px-4 py-4", className)}>
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {hero}
        <div className="grid grid-cols-1 gap-4 @min-[700px]/content:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">{main}</div>
          <div className="flex min-w-0 flex-col gap-4">{side}</div>
        </div>
      </div>
    </div>
  );
}
