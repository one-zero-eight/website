import {
  EnrollmentType,
  SchemaEnrollment,
  SchemaHost,
  SchemaPublicHost,
  SchemaResolvedLocation,
} from "@/api/workshops/types";
import { formatEventDateRange, getEventEndsAt } from "../utils/datetime";
import { PublicHostsList, StoredHostsList } from "./HostLink";
import { LocationLink } from "./LocationLink";

function formatEnrollment(enrollment?: SchemaEnrollment | null) {
  if (!enrollment) {
    return null;
  }

  if (enrollment.type === EnrollmentType.external) {
    return enrollment.url?.trim()
      ? { label: "External", url: enrollment.url.trim() }
      : { label: "External", url: null };
  }

  if (enrollment.capacity === null || enrollment.capacity === undefined) {
    return { label: "On InNoHassle · unlimited", url: null };
  }

  return {
    label: `On InNoHassle · ${enrollment.capacity} participants`,
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
  actions,
}: {
  hosts?: SchemaPublicHost[] | null;
  storedHosts?: SchemaHost[] | null;
  clubs?: { club_id: string; title: string }[];
  startsAt?: string | null;
  location?: SchemaResolvedLocation | null;
  durationHours?: number | null;
  enrollment?: SchemaEnrollment | null;
  actions?: React.ReactNode;
}) {
  const endsAt = getEventEndsAt(startsAt, durationHours);
  const enrollmentInfo = formatEnrollment(enrollment);

  return (
    <div className="border-base-300 relative rounded-2xl border p-4">
      {actions && (
        <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-2">
          {actions}
        </div>
      )}
      <ul
        className={
          actions
            ? "flex flex-col gap-3 pr-28 text-sm"
            : "flex flex-col gap-3 text-sm"
        }
      >
        <li className="flex items-center gap-2">
          <span className="icon-[material-symbols--schedule-outline] shrink-0 text-xl" />
          <span>{formatEventDateRange(startsAt, endsAt)}</span>
        </li>

        <li className="flex items-center gap-2">
          <span className="icon-[material-symbols--person-outline] shrink-0 text-xl" />
          <div className="min-w-0">
            {hosts ? (
              <PublicHostsList hosts={hosts} />
            ) : (
              <StoredHostsList hosts={storedHosts ?? []} clubs={clubs} />
            )}
          </div>
        </li>

        <li className="flex items-center gap-2">
          <span className="icon-[material-symbols--location-on-outline] shrink-0 text-xl" />
          <LocationLink location={location} />
        </li>

        {enrollmentInfo && (
          <li className="flex items-center gap-2">
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
          </li>
        )}
      </ul>
    </div>
  );
}
