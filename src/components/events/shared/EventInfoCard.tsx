import {
  EnrollmentType,
  SchemaEnrollment,
  SchemaEventLink,
  SchemaHost,
  SchemaPublicHost,
} from "@/api/workshops/types";
import { Link } from "@tanstack/react-router";
import { formatEventDateTime } from "../utils/datetime";
import { PublicHostsList, StoredHostsList } from "./HostLink";

function formatDurationHours(durationHours?: number | null) {
  if (durationHours === null || durationHours === undefined) {
    return null;
  }

  if (durationHours === 1) {
    return "1 hour";
  }

  return `${durationHours} hours`;
}

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
    return { label: "Internal enrollment · unlimited", url: null };
  }

  return {
    label: `Internal enrollment · capacity ${enrollment.capacity}`,
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
  const durationLabel = formatDurationHours(durationHours);
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

        {durationLabel && (
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--timelapse-outline] shrink-0 text-xl" />
            <span>{durationLabel}</span>
          </div>
        )}

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

        {visibleLinks.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="icon-[material-symbols--link] shrink-0 text-xl" />
            <ul className="flex min-w-0 flex-col gap-1">
              {visibleLinks.map((link) => (
                <li key={`${link.url}-${link.name ?? ""}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="wrap-anywhere underline underline-offset-2"
                  >
                    {link.name?.trim() || link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {actions && <div className="mt-4 flex justify-end">{actions}</div>}
    </div>
  );
}
