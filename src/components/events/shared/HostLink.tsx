import { $clubs } from "@/api/clubs";
import { HostType, SchemaHost, SchemaPublicHost } from "@/api/workshops/types";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import {
  displayPublicHost,
  displayStoredHost,
  HostDisplay,
} from "../utils/host";

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

function HostDisplayLink({ host }: { host: HostDisplay }) {
  if (!host.link) {
    return <span>{host.displayName}</span>;
  }

  return (
    <a
      href={host.link}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {host.displayName}
    </a>
  );
}

export function PublicHostsList({
  hosts,
  linked = true,
}: {
  hosts: SchemaPublicHost[];
  linked?: boolean;
}) {
  if (hosts.length === 0) {
    return <span>TBA</span>;
  }

  if (!linked) {
    return (
      <span className="inline">
        {hosts.map((host, index) => (
          <Fragment key={host.id}>
            {index > 0 && <span>, </span>}
            <span>{displayPublicHost(host).displayName}</span>
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <span className="inline">
      {hosts.map((host, index) => (
        <Fragment key={host.id}>
          {index > 0 && <span>, </span>}
          <PublicHostLink host={host} />
        </Fragment>
      ))}
    </span>
  );
}

export function StoredHostsList({
  hosts,
  clubs,
  linked = true,
}: {
  hosts: SchemaHost[];
  clubs: { club_id: string; title: string }[];
  linked?: boolean;
}) {
  if (hosts.length === 0) {
    return <span>TBA</span>;
  }

  if (!linked) {
    return (
      <span className="inline">
        {hosts.map((host, index) => (
          <Fragment key={host.id ?? index}>
            {index > 0 && <span>, </span>}
            <span>
              {displayStoredHost(host, clubs)?.displayName ?? "Unknown host"}
            </span>
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <span className="inline">
      {hosts.map((host, index) => (
        <Fragment key={host.id}>
          {index > 0 && <span>, </span>}
          <StoredHostLink host={host} clubs={clubs} />
        </Fragment>
      ))}
    </span>
  );
}

export function IcsHostsList({ hosts }: { hosts: HostDisplay[] }) {
  if (hosts.length === 0) {
    return null;
  }

  return (
    <span className="inline">
      {hosts.map((host, index) => (
        <Fragment key={`${host.displayName}-${index}`}>
          {index > 0 && <span>, </span>}
          <HostDisplayLink host={host} />
        </Fragment>
      ))}
    </span>
  );
}
