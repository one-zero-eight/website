import { HostType, SchemaHost, SchemaPublicHost } from "@/api/workshops/types";

export type HostDisplay = {
  displayName: string;
  link?: string | null;
};

export function displayPublicHost(host: SchemaPublicHost): HostDisplay {
  return {
    displayName: host.display_name,
    link: host.link,
  };
}

export function displayStoredHost(
  host: SchemaHost | null | undefined,
  clubs: { club_id: string; title: string }[],
): HostDisplay | null {
  if (!host) {
    return null;
  }

  if (host.type === HostType.external) {
    return {
      displayName: host.name || "Unknown host",
      link: host.url,
    };
  }

  if (host.type === HostType.club && host.club_id) {
    const owned = clubs.find((club) => club.club_id === host.club_id);
    return {
      displayName: owned?.title ?? "Club",
      link: null,
    };
  }

  return {
    displayName: "Unknown host",
    link: null,
  };
}

/** Parse ICS DESCRIPTION lines like `Host: Name` + optional URL on the next line. */
export function parseIcsHostDescription(description: string | undefined) {
  if (!description) {
    return [] as HostDisplay[];
  }

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hosts: HostDisplay[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^host:\s*/i.test(line)) {
      continue;
    }

    const displayName = line.replace(/^host:\s*/i, "").trim() || "Unknown host";
    const next = lines[i + 1];
    const link =
      next && /^https?:\/\//i.test(next) && !/^host:\s*/i.test(next)
        ? next
        : null;

    hosts.push({ displayName, link });
    if (link) {
      i += 1;
    }
  }

  return hosts;
}
