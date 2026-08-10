import { SchemaHost } from "@/api/workshops/types";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/ui/cn";
import { formatEventDateTime } from "../utils/datetime";
import { StoredHostsList } from "./HostLink";

const statusClassName: Record<string, string> = {
  published: "badge-success",
  approved: "badge-success",
  pending: "badge-warning",
  declined: "badge-error",
  unpublished: "badge-ghost",
};

const statusLabel: Record<string, string> = {
  pending: "Pending Review",
};

export function EventSummaryCard({
  href,
  imageUrl,
  name,
  hosts,
  clubs = [],
  startsAt,
  location,
  status,
  invitedBy,
  footer,
}: {
  href: string;
  imageUrl?: string | null;
  name?: string | null;
  hosts?: SchemaHost[] | null;
  clubs?: { club_id: string; title: string }[];
  startsAt?: string | null;
  location?: string | null;
  status?: string | null;
  invitedBy?: string | null;
  footer?: React.ReactNode;
}) {
  const hostList = hosts ?? [];

  return (
    <div className="border-base-300 hover:border-primary/40 overflow-hidden rounded-2xl border transition-colors">
      <Link to={href} className="block">
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
                "badge absolute top-2 right-2",
                statusLabel[status] ? null : "capitalize",
                statusClassName[status] ?? "badge-ghost",
              )}
            >
              {statusLabel[status] ?? status}
            </span>
          )}
          {invitedBy && (
            <span className="badge badge-info absolute top-2 left-2">
              Invited
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-lg font-medium wrap-anywhere">
            {name?.trim() || "Untitled event"}
          </h3>
          {invitedBy && (
            <p className="text-base-content/70 text-sm">
              Invited by {invitedBy}
            </p>
          )}
          <div className="text-base-content/80 flex flex-col gap-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="icon-[material-symbols--person-outline] shrink-0 text-lg" />
              <span>
                {hostList.length === 0 ? (
                  "No hosts yet"
                ) : (
                  <StoredHostsList hosts={hostList} clubs={clubs} />
                )}
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
      {footer && (
        <div className="border-base-300 border-t px-4 py-3">{footer}</div>
      )}
    </div>
  );
}
