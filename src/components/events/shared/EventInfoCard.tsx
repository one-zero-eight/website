import {
  EnrollmentType,
  SchemaEnrollment,
  SchemaEventLink,
  SchemaHost,
  SchemaPublicHost,
} from "@/api/workshops/types";
import { Link } from "@tanstack/react-router";
import { formatEventDateTime, getEventEndsAt } from "../utils/datetime";
import { getLinkDisplayLabel } from "../utils/links";
import { PublicHostsList, StoredHostsList } from "./HostLink";

function formatEnrollment(enrollment?: SchemaEnrollment | null) {
  if (!enrollment) {
    return null;
  }

  if (enrollment.type === EnrollmentType.external) {
    return enrollment.url?.trim()
      ? { label: "External enrollment", url: enrollment.url.trim() }
      : { label: "External enrollment", url: null };
  }

  if (enrollment.capacity === null || enrollment.capacity === undefined) {
    return { label: "On InNoHassle · unlimited", url: null };
  }

  return {
    label: `On InNoHassle · capacity ${enrollment.capacity}`,
    url: null,
  };
}

export function EventInfoCard({
  hosts,
  storedHosts,
  clubs = [],
  startsAt,
  location,
  durationHours,
  enrollment,
  links,
  actions,
}: {
  hosts?: SchemaPublicHost[] | null;
  storedHosts?: SchemaHost[] | null;
  clubs?: { club_id: string; title: string }[];
  startsAt?: string | null;
  location?: string | null;
  durationHours?: number | null;
  enrollment?: SchemaEnrollment | null;
  links?: SchemaEventLink[] | null;
  actions?: React.ReactNode;
}) {
  const locationLabel = location?.trim() || "TBA";
  const endsAt = getEventEndsAt(startsAt, durationHours);
  const enrollmentInfo = formatEnrollment(enrollment);
  const visibleLinks = (links ?? []).filter((link) => link.url.trim());

  return (
    <div className="border-base-300 rounded-2xl border p-4">
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="icon-[material-symbols--person-outline] shrink-0 text-xl" />
          <div className="min-w-0">
            {hosts ? (
              <PublicHostsList hosts={hosts} />
            ) : (
              <StoredHostsList hosts={storedHosts ?? []} clubs={clubs} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="icon-[material-symbols--schedule-outline] shrink-0 text-xl" />
          <span>{formatEventDateTime(startsAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="icon-[material-symbols--event-available-outline] shrink-0 text-xl" />
          <span>{formatEventDateTime(endsAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="icon-[material-symbols--location-on-outline] shrink-0 text-xl" />
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

        {enrollmentInfo && (
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--how-to-reg-outline] shrink-0 text-xl" />
            {enrollmentInfo.url ? (
              <a
                href={enrollmentInfo.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {enrollmentInfo.label}
              </a>
            ) : (
              <span>{enrollmentInfo.label}</span>
            )}
          </div>
        )}

        {visibleLinks.map((link) => (
          <div key={link.id} className="flex items-center gap-2">
            <span className="icon-[material-symbols--link] shrink-0 text-xl" />
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 wrap-anywhere underline underline-offset-2"
            >
              {getLinkDisplayLabel(link)}
            </a>
          </div>
        ))}
      </div>

      {actions && <div className="mt-4 flex justify-end">{actions}</div>}
    </div>
  );
}
