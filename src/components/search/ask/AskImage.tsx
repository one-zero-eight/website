import { cn } from "@/lib/ui/cn";
import { useState } from "react";

/** A picture from the answer or from a source, loaded from its own host without a referrer. A broken one hides itself. */
export function AskImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !/^https?:\/\//i.test(src)) return null;
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block max-w-full"
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(
          "rounded-field max-h-80 max-w-full object-contain",
          className,
        )}
      />
    </a>
  );
}
