import { SchemaPublicHost, SchemaHost } from "@/api/workshops/types";
import { Link } from "@tanstack/react-router";
import { formatEventDateTime } from "../utils/datetime";
import { PublicHostLink, StoredHostLink } from "./HostLink";

export function EventInfoCard({
  host,
  storedHost,
  clubs = [],
  startsAt,
  location,
  actions,
}: {
  host?: SchemaPublicHost | null;
  storedHost?: SchemaHost | null;
  clubs?: { club_id: string; title: string }[];
  startsAt?: string | null;
  location?: string | null;
  actions?: React.ReactNode;
}) {
  const locationLabel = location?.trim() || "TBA";

  return (
    <div className="border-base-300 rounded-2xl border p-4">
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-start gap-2">
          <span className="icon-[material-symbols--person-outline] mt-0.5 shrink-0 text-xl" />
          <div className="min-w-0">
            {host ? (
              <PublicHostLink host={host} />
            ) : (
              <StoredHostLink host={storedHost} clubs={clubs} />
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span className="icon-[material-symbols--schedule-outline] mt-0.5 shrink-0 text-xl" />
          <span>{formatEventDateTime(startsAt)}</span>
        </div>

        <div className="flex items-start gap-2">
          <span className="icon-[material-symbols--location-on-outline] mt-0.5 shrink-0 text-xl" />
          {locationLabel.toUpperCase() === "TBA" ||
          locationLabel.toUpperCase() === "ONLINE" ||
          locationLabel.toUpperCase() === "ОНЛАЙН" ? (
            <span>{locationLabel}</span>
          ) : (
            <Link
              to="/maps"
              search={{ q: locationLabel }}
              className="underline underline-offset-2"
            >
              {locationLabel}
            </Link>
          )}
        </div>
      </div>

      {actions && <div className="mt-4 flex justify-end">{actions}</div>}
    </div>
  );
}
