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

export function parseIcsHostDescription(description: string | undefined) {
  if (!description) {
    return null;
  }

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hostLine = lines.find((line) => /^host:\s*/i.test(line));
  if (!hostLine) {
    return null;
  }

  const displayName = hostLine.replace(/^host:\s*/i, "").trim();
  const linkLine = lines.find(
    (line) => line !== hostLine && /^https?:\/\//i.test(line),
  );

  return {
    displayName: displayName || "Unknown host",
    link: linkLine ?? null,
  } satisfies HostDisplay;
}
