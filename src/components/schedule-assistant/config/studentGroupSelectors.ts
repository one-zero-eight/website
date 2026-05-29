import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";

export function isStudentGroupSelector(token: string): boolean {
  return String(token || "")
    .trim()
    .startsWith("@");
}

export type ParsedStudentGroupSelector =
  | { kind: "program"; programCode: string }
  | { kind: "program_track"; programCode: string; trackRef: string };

/** Parses ``@PROGRAM`` or ``@PROGRAM/TRACK`` selectors from config schema. */
export function parseStudentGroupSelector(
  token: string,
): ParsedStudentGroupSelector | null {
  const raw = String(token || "").trim();
  if (!raw.startsWith("@")) return null;
  const withoutPrefix = raw.slice(1).trim();
  if (!withoutPrefix) return null;
  const slash = withoutPrefix.indexOf("/");
  if (slash < 0) {
    return { kind: "program", programCode: withoutPrefix };
  }
  const programCode = withoutPrefix.slice(0, slash).trim();
  const trackRef = withoutPrefix.slice(slash + 1).trim();
  if (!programCode || !trackRef) return null;
  return { kind: "program_track", programCode, trackRef };
}

function trackMatchesRef(
  track: { code?: string; name?: string },
  trackRef: string,
): boolean {
  const ref = trackRef.trim().toLowerCase();
  const code = String(track.code || "")
    .trim()
    .toLowerCase();
  const name = String(track.name || "")
    .trim()
    .toLowerCase();
  return code === ref || name === ref;
}

function collectGroupsFromProgram(
  program: SchemaScheduleConfig["sections"][number]["programs"][number],
  trackRef?: string,
): string[] {
  const tracks = normalizeTracksFromSectionProgram(program);
  if (!trackRef) {
    const groups: string[] = [];
    for (const track of tracks) {
      for (const groupId of track.groups || []) {
        groups.push(String(groupId));
      }
    }
    return groups;
  }
  for (const track of tracks) {
    if (trackMatchesRef(track, trackRef)) {
      return (track.groups || []).map(String);
    }
  }
  return [];
}

/** Resolves one token to concrete student group ids (pass-through for direct ids). */
export function expandStudentGroupSelector(
  config: SchemaScheduleConfig | null,
  token: string,
): string[] {
  const raw = String(token || "").trim();
  if (!raw) return [];
  if (!isStudentGroupSelector(raw)) return [raw];

  const parsed = parseStudentGroupSelector(raw);
  if (!parsed) return [raw];

  const groups: string[] = [];
  for (const section of config?.sections || []) {
    for (const program of section.programs || []) {
      if (String(program.code || "").trim() !== parsed.programCode) continue;
      if (parsed.kind === "program") {
        groups.push(...collectGroupsFromProgram(program));
      } else {
        groups.push(...collectGroupsFromProgram(program, parsed.trackRef));
      }
    }
  }
  return groups.length ? groups : [raw];
}

/** Union of expanded group ids for several tokens (selectors or direct ids). */
export function expandStudentGroupSelectors(
  config: SchemaScheduleConfig | null,
  tokens: string[],
): string[] {
  const out = new Set<string>();
  for (const token of tokens) {
    for (const groupId of expandStudentGroupSelector(config, token)) {
      if (!isStudentGroupSelector(groupId)) out.add(groupId);
    }
  }
  return Array.from(out).sort();
}

export type ProgramTrackUsageTarget = {
  programId: string;
  programTitle: string;
  trackTitle: string;
};

/** Maps a course audience token to program/track buckets for the courses tab tree. */
export function resolveCourseUsageTargets(
  config: SchemaScheduleConfig | null,
  rawTarget: string,
  programById: Map<string, { title: string; trackNames: string[] }>,
  groupToProgramTrack: Map<
    string,
    { programId: string; programTitle: string; trackName: string }
  >,
): ProgramTrackUsageTarget[] {
  const token = String(rawTarget || "").trim();
  if (!token) return [];

  const parsed = parseStudentGroupSelector(token);
  if (parsed?.kind === "program") {
    const programMeta = programById.get(parsed.programCode);
    if (!programMeta) return [];
    if (!programMeta.trackNames.length) {
      return [
        {
          programId: parsed.programCode,
          programTitle: programMeta.title,
          trackTitle: "Без направления",
        },
      ];
    }
    return programMeta.trackNames.map((trackTitle) => ({
      programId: parsed.programCode,
      programTitle: programMeta.title,
      trackTitle: trackTitle || "Без направления",
    }));
  }

  if (parsed?.kind === "program_track") {
    const programMeta = programById.get(parsed.programCode);
    const programTitle = programMeta?.title || parsed.programCode;
    return [
      {
        programId: parsed.programCode,
        programTitle,
        trackTitle: parsed.trackRef || "Без направления",
      },
    ];
  }

  const byGroup = groupToProgramTrack.get(token);
  if (!byGroup) return [];
  return [
    {
      programId: byGroup.programId,
      programTitle: byGroup.programTitle,
      trackTitle: byGroup.trackName,
    },
  ];
}
