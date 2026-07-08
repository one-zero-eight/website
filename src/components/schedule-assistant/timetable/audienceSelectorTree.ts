import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";

export type AudienceSelectorGroup = {
  token: string;
  title: string;
  code: string;
};

export type AudienceSelectorTrack = {
  key: string;
  token: string;
  title: string;
  groups: AudienceSelectorGroup[];
};

export type AudienceSelectorProgram = {
  key: string;
  token: string;
  title: string;
  tracks: AudienceSelectorTrack[];
};

export type AudienceSelectorSection = {
  key: string;
  title: string;
  programs: AudienceSelectorProgram[];
};

function groupTitleByCode(config: SchemaScheduleConfig) {
  return new Map(
    (config.students_groups ?? []).map((group) => [
      String(group.code || "").trim(),
      String(group.name || group.code || "").trim(),
    ]),
  );
}

export function buildAudienceSelectorTree(
  config: SchemaScheduleConfig,
): AudienceSelectorSection[] {
  const groupTitles = groupTitleByCode(config);
  const sections: AudienceSelectorSection[] = [];

  for (const section of getScheduleSections(config)) {
    const sectionCode = String(section.code || "").trim();
    const sectionTitle = String(section.name || sectionCode).trim();
    if (!sectionCode || !sectionTitle) continue;

    const programs: AudienceSelectorProgram[] = [];
    for (const program of section.programs || []) {
      const code = String(program.code || "").trim();
      if (!code) continue;
      const title = String(program.name || code).trim();
      const tracks: AudienceSelectorTrack[] = [];

      for (const [trackIndex, track] of normalizeTracksFromSectionProgram(
        program,
      ).entries()) {
        const trackName = String(track.name || "Трек").trim();
        const trackRef = String(track.code || track.name || "").trim();
        const groups = (track.groups || []).map((groupId) => {
          const gid = String(groupId).trim();
          return {
            token: gid,
            code: gid,
            title: groupTitles.get(gid) || gid,
          };
        });
        if (!trackRef && !groups.length) continue;
        tracks.push({
          key: `${sectionCode}-${code}-t${trackIndex}`,
          token: trackRef ? `@${code}/${trackRef}` : "",
          title: trackName,
          groups,
        });
      }

      programs.push({
        key: `${sectionCode}-${code}`,
        token: `@${code}`,
        title,
        tracks,
      });
    }

    if (programs.length) {
      sections.push({ key: sectionCode, title: sectionTitle, programs });
    }
  }

  return sections;
}

export function collectTrackTokens(track: AudienceSelectorTrack): string[] {
  const tokens: string[] = [];
  if (track.token) tokens.push(track.token);
  for (const group of track.groups) tokens.push(group.token);
  return tokens.filter(Boolean);
}

export function collectProgramTokens(
  program: AudienceSelectorProgram,
): string[] {
  const tokens = [program.token];
  for (const track of program.tracks) {
    tokens.push(...collectTrackTokens(track));
  }
  return tokens.filter(Boolean);
}

export function collectSectionTokens(
  section: AudienceSelectorSection,
): string[] {
  const tokens: string[] = [];
  for (const program of section.programs) {
    tokens.push(...collectProgramTokens(program));
  }
  return tokens.filter(Boolean);
}

export function isTokenSetFullySelected(
  tokens: string[],
  selected: ReadonlySet<string>,
) {
  return tokens.length > 0 && tokens.every((token) => selected.has(token));
}

export function minimizeAudienceTokens(
  tokens: string[],
  tree: AudienceSelectorSection[],
): string[] {
  const set = new Set(
    tokens.map((token) => String(token || "").trim()).filter(Boolean),
  );

  for (const section of tree) {
    for (const program of section.programs) {
      if (!set.has(program.token)) continue;
      for (const descendant of collectProgramTokens(program)) {
        if (descendant !== program.token) set.delete(descendant);
      }
    }
    for (const program of section.programs) {
      for (const track of program.tracks) {
        if (!track.token || !set.has(track.token)) continue;
        for (const group of track.groups) set.delete(group.token);
      }
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

export function isProgramEffectivelySelected(
  program: AudienceSelectorProgram,
  selected: ReadonlySet<string>,
) {
  return selected.has(program.token);
}

export function isTrackEffectivelySelected(
  program: AudienceSelectorProgram,
  track: AudienceSelectorTrack,
  selected: ReadonlySet<string>,
) {
  if (selected.has(program.token)) return true;
  return track.token ? selected.has(track.token) : false;
}

export function isGroupEffectivelySelected(
  program: AudienceSelectorProgram,
  track: AudienceSelectorTrack,
  group: AudienceSelectorGroup,
  selected: ReadonlySet<string>,
) {
  if (selected.has(program.token)) return true;
  if (track.token && selected.has(track.token)) return true;
  return selected.has(group.token);
}

function tokensForProgramMinusTrack(
  program: AudienceSelectorProgram,
  excludeTrack: AudienceSelectorTrack,
) {
  const tokens: string[] = [];
  for (const track of program.tracks) {
    if (track.key === excludeTrack.key) continue;
    if (track.token) tokens.push(track.token);
    else tokens.push(...track.groups.map((group) => group.token));
  }
  return tokens;
}

function tokensForTrackMinusGroup(
  track: AudienceSelectorTrack,
  excludeGroupToken: string,
) {
  if (!track.token) {
    return track.groups
      .map((group) => group.token)
      .filter((token) => token !== excludeGroupToken);
  }
  return track.groups
    .filter((group) => group.token !== excludeGroupToken)
    .map((group) => group.token);
}

function tokensForProgramMinusGroup(
  program: AudienceSelectorProgram,
  track: AudienceSelectorTrack,
  excludeGroupToken: string,
) {
  const tokens: string[] = [];
  for (const programTrack of program.tracks) {
    if (programTrack.key === track.key) {
      tokens.push(...tokensForTrackMinusGroup(programTrack, excludeGroupToken));
      continue;
    }
    if (programTrack.token) tokens.push(programTrack.token);
    else tokens.push(...programTrack.groups.map((group) => group.token));
  }
  return tokens;
}

export type AudienceSelectableItem =
  | { kind: "program"; key: string; program: AudienceSelectorProgram }
  | {
      kind: "track";
      key: string;
      program: AudienceSelectorProgram;
      track: AudienceSelectorTrack;
    }
  | {
      kind: "group";
      key: string;
      program: AudienceSelectorProgram;
      track: AudienceSelectorTrack;
      group: AudienceSelectorGroup;
    };

export function flattenAudienceSelectorTree(
  tree: AudienceSelectorSection[],
): AudienceSelectableItem[] {
  const items: AudienceSelectableItem[] = [];
  for (const section of tree) {
    for (const program of section.programs) {
      items.push({ kind: "program", key: program.key, program });
      for (const track of program.tracks) {
        if (track.token) {
          items.push({
            kind: "track",
            key: track.key,
            program,
            track,
          });
        }
        for (const group of track.groups) {
          items.push({
            kind: "group",
            key: `${track.key}-${group.token}`,
            program,
            track,
            group,
          });
        }
      }
    }
  }
  return items;
}

export function toggleAudienceSelection(
  item: AudienceSelectableItem,
  selected: ReadonlySet<string>,
  tree: AudienceSelectorSection[],
): string[] {
  const next = new Set(selected);

  if (item.kind === "program") {
    const { program } = item;
    if (isProgramEffectivelySelected(program, next)) {
      next.delete(program.token);
    } else {
      next.add(program.token);
      for (const token of collectProgramTokens(program)) {
        if (token !== program.token) next.delete(token);
      }
    }
    return minimizeAudienceTokens(Array.from(next), tree);
  }

  if (item.kind === "track") {
    const { program, track } = item;
    if (!track.token) return minimizeAudienceTokens(Array.from(next), tree);

    if (isTrackEffectivelySelected(program, track, next)) {
      if (next.has(program.token)) {
        next.delete(program.token);
        for (const token of tokensForProgramMinusTrack(program, track)) {
          next.add(token);
        }
      } else {
        next.delete(track.token);
      }
    } else {
      next.delete(program.token);
      next.add(track.token);
      for (const group of track.groups) next.delete(group.token);
    }
    return minimizeAudienceTokens(Array.from(next), tree);
  }

  const { program, track, group } = item;
  if (isGroupEffectivelySelected(program, track, group, next)) {
    if (next.has(program.token)) {
      next.delete(program.token);
      for (const token of tokensForProgramMinusGroup(
        program,
        track,
        group.token,
      )) {
        next.add(token);
      }
    } else if (track.token && next.has(track.token)) {
      next.delete(track.token);
      for (const token of tokensForTrackMinusGroup(track, group.token)) {
        next.add(token);
      }
    } else {
      next.delete(group.token);
    }
  } else {
    if (track.token) next.delete(track.token);
    next.delete(program.token);
    next.add(group.token);
  }
  return minimizeAudienceTokens(Array.from(next), tree);
}

function matchesQuery(parts: string[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return parts.some((part) => part.toLowerCase().includes(normalized));
}

function filterGroups(groups: AudienceSelectorGroup[], query: string) {
  return groups.filter((group) =>
    matchesQuery([group.token, group.title, group.code], query),
  );
}

function filterTracks(tracks: AudienceSelectorTrack[], query: string) {
  return tracks
    .map((track) => {
      if (matchesQuery([track.token, track.title], query)) return track;
      return { ...track, groups: filterGroups(track.groups, query) };
    })
    .filter(
      (track) =>
        track.groups.length > 0 ||
        matchesQuery([track.token, track.title], query),
    );
}

function filterPrograms(programs: AudienceSelectorProgram[], query: string) {
  return programs
    .map((program) => {
      if (matchesQuery([program.token, program.title], query)) return program;
      return { ...program, tracks: filterTracks(program.tracks, query) };
    })
    .filter(
      (program) =>
        program.tracks.length > 0 ||
        matchesQuery([program.token, program.title], query),
    );
}

export function filterAudienceSelectorTree(
  tree: AudienceSelectorSection[],
  query: string,
) {
  const normalized = query.trim();
  if (!normalized) return tree;
  return tree
    .map((section) => {
      if (matchesQuery([section.title, section.key], normalized))
        return section;
      const programs = filterPrograms(section.programs, normalized);
      if (!programs.length) return null;
      return { ...section, programs };
    })
    .filter((section): section is AudienceSelectorSection => section !== null);
}
