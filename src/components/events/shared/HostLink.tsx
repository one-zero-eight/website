import { $clubs } from "@/api/clubs";
import { HostType, SchemaHost, SchemaPublicHost } from "@/api/workshops/types";
import { Link } from "@tanstack/react-router";
import { displayPublicHost, displayStoredHost } from "../utils/host";

export function PublicHostLink({ host }: { host: SchemaPublicHost }) {
  const { displayName, link } = displayPublicHost(host);

  if (!link) {
    return <span>{displayName}</span>;
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {displayName}
    </a>
  );
}

export function StoredHostLink({
  host,
  clubs,
}: {
  host: SchemaHost | null | undefined;
  clubs: { club_id: string; title: string }[];
}) {
  const ownedDisplay = displayStoredHost(host, clubs);
  const needsClubFetch =
    host?.type === HostType.club &&
    !!host.club_id &&
    !clubs.some((club) => club.club_id === host.club_id);

  const { data: club } = $clubs.useQuery(
    "get",
    "/clubs/by-id/{id}",
    { params: { path: { id: host?.club_id ?? "" } } },
    { enabled: needsClubFetch },
  );

  if (!host || !ownedDisplay) {
    return <span>TBA</span>;
  }

  if (host.type === HostType.club) {
    const title = club?.title ?? ownedDisplay.displayName;
    const slug = club?.slug;

    if (slug) {
      return (
        <Link
          to="/clubs/$slug"
          params={{ slug }}
          className="underline underline-offset-2"
        >
          {title}
        </Link>
      );
    }

    return <span>{title}</span>;
  }

  if (ownedDisplay.link) {
    return (
      <a
        href={ownedDisplay.link}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {ownedDisplay.displayName}
      </a>
    );
  }

  return <span>{ownedDisplay.displayName}</span>;
}
