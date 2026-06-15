import type { SchemaSectionProgram } from "@/api/schedule-assistant/types.ts";

/**
 * Единый список треков для программы в `sections[].programs[]`:
 * либо `tracks`, либо один синтетический трек из верхнего `groups`, если треков нет.
 */
export function normalizeTracksFromSectionProgram(
  program: SchemaSectionProgram,
): Array<{
  name: string;
  groups: string[];
  code?: string;
  kind?: string | null;
}> {
  if (Array.isArray(program?.tracks) && program.tracks.length) {
    return program.tracks;
  }
  if (
    "groups" in program &&
    Array.isArray(program.groups) &&
    program.groups.length
  ) {
    const name = String(program.code || program.name || "").trim() || "—";
    return [{ name, groups: program.groups }];
  }
  return [];
}

export function programUsesExplicitTracks(
  program: SchemaSectionProgram,
): boolean {
  return Array.isArray(program?.tracks) && program.tracks.length > 0;
}

export function getNormalizedTrack(
  program: SchemaSectionProgram | null | undefined,
  trackIndex: number,
) {
  if (!program) return undefined;
  return normalizeTracksFromSectionProgram(program)[trackIndex];
}

export function mutateNormalizedTrackGroups(
  program: SchemaSectionProgram,
  trackIndex: number,
  mutator: (groups: string[]) => string[],
): void {
  if (programUsesExplicitTracks(program)) {
    const track = program.tracks[trackIndex];
    if (!track) return;
    track.groups = mutator([...(track.groups || [])]);
    return;
  }
  if (trackIndex !== 0) return;
  program.groups = mutator([...(program.groups || [])]);
}
