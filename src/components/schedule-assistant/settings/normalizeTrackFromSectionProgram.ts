import type {
  ScheduleConfigProgram,
  ScheduleConfigSectionProgram,
} from "@/components/schedule-assistant/settings/configTypes.ts";

/**
 * Единый список треков для программы в `sections[].programs[]`:
 * либо `tracks`, либо один синтетический трек из верхнего `groups`, если треков нет.
 */
export function normalizeTracksFromSectionProgram(
  program: ScheduleConfigSectionProgram | ScheduleConfigProgram,
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
