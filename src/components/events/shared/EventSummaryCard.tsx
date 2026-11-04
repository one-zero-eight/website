import { Trans, useLingui } from "@lingui/react/macro";
import {
  SchemaHost,
  SchemaPublicHost,
  SchemaResolvedLocation,
} from "@/api/events/types";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/ui/cn";
import { formatEventDateTime } from "../utils/datetime";
import { locationDisplayName } from "../utils/location";
import { PublicHostsList, StoredHostsList } from "./HostLink";
const statusClassName: Record<string, string> = {
  published: "badge-success",
  approved: "badge-success",
  pending: "badge-warning",
  declined: "badge-error",
  unpublished: "badge-ghost",
};

export function EventSummaryCard({
  href,
  imageUrl,
  name,
  hosts,
  publicHosts,
  clubs = [],
  startsAt,
  location,
  status,
  invitedBy,
  footer,
  compact = false,
}: {
  href: string;
  imageUrl?: string | null;
  name?: string | null;
  hosts?: SchemaHost[] | null;
  publicHosts?: SchemaPublicHost[] | null;
  clubs?: { club_id: string; title: string }[];
  startsAt?: string | null;
  location?: SchemaResolvedLocation | null;
  status?: string | null;
  invitedBy?: string | null;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  const { t } = useLingui();
  const hostList = hosts ?? [];
  const publicHostList = publicHosts ?? [];

  function getStatusLabel(value: string): string | undefined {
    if (value === "pending") {
      return t`Pending Review`;
    }
    if (value === "approved") {
      return t`Approved`;
    }
    if (value === "declined") {
      return t`Declined`;
    }
    if (value === "published") {
      return t`Published`;
    }
    if (value === "unpublished") {
      return t`Unpublished`;
    }
    return undefined;
  }

  return (
    <div className="border-base-300 hover:border-primary/40 overflow-hidden rounded-2xl border transition-colors">
      <Link to={href} className="block">
        <div className="bg-base-200 relative aspect-video w-full">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-base-content/20 flex h-full w-full items-center justify-center">
              <span
                className={cn(
                  "icon-[mdi--image-outline]",
                  compact ? "size-8" : "size-12",
                )}
              />
            </div>
          )}
          {status && (
            <span
              className={cn(
                "badge absolute top-2 right-2",
                compact && "badge-sm",
                getStatusLabel(status) ? null : "capitalize",
                statusClassName[status] ?? "badge-ghost",
              )}
            >
              {getStatusLabel(status) ?? status}
            </span>
          )}
          {invitedBy && (
            <span
              className={cn(
                "badge badge-info absolute top-2 left-2",
                compact && "badge-sm",
              )}
            >
              <Trans>Invited</Trans>
            </span>
          )}
        </div>

        <div
          className={cn("flex flex-col", compact ? "gap-1.5 p-3" : "gap-2 p-4")}
        >
          <h3
            className={cn(
              "font-medium wrap-anywhere",
              compact ? "text-sm" : "text-lg",
            )}
          >
            {name?.trim() || t`Untitled event`}
          </h3>
          {invitedBy && (
            <p
              className={cn(
                "text-base-content/70",
                compact ? "text-xs" : "text-sm",
              )}
            >
              <Trans>Invited by {invitedBy}</Trans>
            </p>
          )}
          <div
            className={cn(
              "text-base-content/80 flex flex-col",
              compact ? "gap-1 text-xs" : "gap-1.5 text-sm",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "icon-[material-symbols--person-outline] shrink-0",
                  compact ? "text-base" : "text-lg",
                )}
              />
              <span>
                {publicHostList.length > 0 ? (
                  <PublicHostsList hosts={publicHostList} linked={false} />
                ) : hostList.length === 0 ? (
                  t`No hosts yet`
                ) : (
                  <StoredHostsList
                    hosts={hostList}
                    clubs={clubs}
                    linked={false}
                  />
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "icon-[material-symbols--schedule-outline] shrink-0",
                  compact ? "text-base" : "text-lg",
                )}
              />
              <span>{formatEventDateTime(startsAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "icon-[material-symbols--location-on-outline] shrink-0",
                  compact ? "text-base" : "text-lg",
                )}
              />
              <span>{locationDisplayName(location)}</span>
            </div>
          </div>
        </div>
      </Link>
      {footer && (
        <div
          className={cn(
            "border-base-300 border-t",
            compact ? "px-3 py-2" : "px-4 py-3",
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
