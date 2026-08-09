import { SchemaHost } from "@/api/workshops/types";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/ui/cn";
import { formatEventDateTime } from "../utils/datetime";
import { StoredHostLink } from "./HostLink";

const statusClassName: Record<string, string> = {
  published: "badge-success",
  pending: "badge-warning",
  declined: "badge-error",
  unpublished: "badge-ghost",
};

export function EventSummaryCard({
  href,
  imageUrl,
  name,
  host,
  clubs = [],
  startsAt,
  location,
  status,
  hostPrefix,
}: {
  href: string;
  imageUrl?: string | null;
  name?: string | null;
  host?: SchemaHost | null;
  clubs?: { club_id: string; title: string }[];
  startsAt?: string | null;
  location?: string | null;
  status?: string | null;
  hostPrefix?: string;
}) {
  return (
    <Link
      to={href}
      className="border-base-300 hover:border-primary/40 block overflow-hidden rounded-2xl border transition-colors"
    >
      <div className="bg-base-200 relative aspect-video w-full">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="text-base-content/20 flex h-full w-full items-center justify-center">
            <span className="icon-[mdi--image-outline] size-12" />
          </div>
        )}
        {status && (
          <span
            className={cn(
              "badge absolute top-2 right-2 capitalize",
              statusClassName[status] ?? "badge-ghost",
            )}
          >
            {status}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-lg font-medium wrap-anywhere">
          {name?.trim() || "Untitled event"}
        </h3>
        <div className="text-base-content/80 flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--person-outline] shrink-0 text-lg" />
            <span>
              {hostPrefix}
              <StoredHostLink host={host} clubs={clubs} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--schedule-outline] shrink-0 text-lg" />
            <span>{formatEventDateTime(startsAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--location-on-outline] shrink-0 text-lg" />
            <span>{location?.trim() || "TBA"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
