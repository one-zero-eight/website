import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import {
  normalizeTracksFromSectionProgram,
  programUsesExplicitTracks,
} from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";

export type AudienceSummaryGroup = {
  code: string;
  title: string;
};

export type AudienceSummaryTrack = {
  title: string;
  /** Whole track selected — show title + info icon, not each group. */
  full: boolean;
  selector: string;
  groups: AudienceSummaryGroup[];
};

export type AudienceSummaryProgram = {
  title: string;
  programCode: string;
  /** Whole program selected. */
  full: boolean;
  selector: string;
  hasExplicitTracks: boolean;
  tracks: AudienceSummaryTrack[];
  /** Groups when program has no explicit tracks and is not fully selected. */
  flatGroups: AudienceSummaryGroup[];
};

function groupTitleByCode(config: SchemaScheduleConfig) {
  return new Map(
    (config.students_groups ?? []).map((group) => [
      String(group.code || "").trim(),
      String(group.name || group.code || "").trim(),
    ]),
  );
}

function toGroup(
  code: string,
  titles: Map<string, string>,
): AudienceSummaryGroup {
  return { code, title: titles.get(code) || code };
}

function isSubset(needles: string[], haystack: ReadonlySet<string>) {
  return needles.length > 0 && needles.every((id) => haystack.has(id));
}

/** Collapse concrete meeting group ids into program → track blocks for the detail panel. */
export function summarizeMeetingAudience(
  config: SchemaScheduleConfig,
  groupIds: string[],
): AudienceSummaryProgram[] {
  const selected = new Set(
    groupIds.map((id) => String(id || "").trim()).filter(Boolean),
  );
  if (!selected.size) return [];

  const titles = groupTitleByCode(config);
  const covered = new Set<string>();
  const programs: AudienceSummaryProgram[] = [];

  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      const programCode = String(program.code || "").trim();
      if (!programCode) continue;

      const hasExplicitTracks = programUsesExplicitTracks(program);
      const tracks = normalizeTracksFromSectionProgram(program);
      const allProgramGroups = tracks.flatMap((track) =>
        (track.groups || []).map(String),
      );
      const selectedInProgram = allProgramGroups.filter((id) =>
        selected.has(id),
      );
      if (!selectedInProgram.length) continue;

      for (const id of selectedInProgram) covered.add(id);

      const programTitle = String(
        program.name || program.code || programCode,
      ).trim();
      const programSelector = `@${programCode}`;

      if (isSubset(allProgramGroups, selected)) {
        if (allProgramGroups.length === 1) {
          programs.push({
            title: programTitle,
            programCode,
            full: false,
            selector: programSelector,
            hasExplicitTracks,
            tracks: hasExplicitTracks
              ? [
                  {
                    title: String(
                      tracks[0]?.name || tracks[0]?.code || "Трек",
                    ).trim(),
                    full: false,
                    selector: (() => {
                      const trackRef = String(
                        tracks[0]?.code || tracks[0]?.name || "",
                      ).trim();
                      return trackRef
                        ? `@${programCode}/${trackRef}`
                        : programSelector;
                    })(),
                    groups: [toGroup(allProgramGroups[0]!, titles)],
                  },
                ]
              : [],
            flatGroups: hasExplicitTracks
              ? []
              : [toGroup(allProgramGroups[0]!, titles)],
          });
        } else {
          programs.push({
            title: programTitle,
            programCode,
            full: true,
            selector: programSelector,
            hasExplicitTracks,
            tracks: [],
            flatGroups: [],
          });
        }
        continue;
      }

      if (!hasExplicitTracks) {
        programs.push({
          title: programTitle,
          programCode,
          full: false,
          selector: programSelector,
          hasExplicitTracks: false,
          tracks: [],
          flatGroups: selectedInProgram.map((id) => toGroup(id, titles)),
        });
        continue;
      }

      const trackBlocks: AudienceSummaryTrack[] = [];
      for (const track of tracks) {
        const trackGroups = (track.groups || []).map(String);
        const selectedInTrack = trackGroups.filter((id) => selected.has(id));
        if (!selectedInTrack.length) continue;

        const trackRef = String(track.code || track.name || "").trim();
        const trackTitle = String(track.name || trackRef || "Трек").trim();
        const trackSelector = trackRef
          ? `@${programCode}/${trackRef}`
          : programSelector;

        if (isSubset(trackGroups, selected) && trackGroups.length > 1) {
          trackBlocks.push({
            title: trackTitle,
            full: true,
            selector: trackSelector,
            groups: [],
          });
        } else {
          trackBlocks.push({
            title: trackTitle,
            full: false,
            selector: trackSelector,
            groups: selectedInTrack.map((id) => toGroup(id, titles)),
          });
        }
      }

      if (trackBlocks.length) {
        programs.push({
          title: programTitle,
          programCode,
          full: false,
          selector: programSelector,
          hasExplicitTracks: true,
          tracks: trackBlocks,
          flatGroups: [],
        });
      }
    }
  }

  const leftovers = [...selected].filter((id) => !covered.has(id));
  if (leftovers.length) {
    programs.push({
      title: "Другие группы",
      programCode: "",
      full: false,
      selector: "",
      hasExplicitTracks: false,
      tracks: [],
      flatGroups: leftovers.map((id) => toGroup(id, titles)),
    });
  }

  return programs;
}

export type AudienceInlineItem = {
  key: string;
  label: string;
  selector: string;
  mode: "program" | "track";
  groupIds: string[];
};

/** Flatten summarized audience into label + tree-icon targets (detail panel / tooltips). */
export function listAudienceInlineItems(
  config: SchemaScheduleConfig,
  groupIds: string[],
): AudienceInlineItem[] {
  const programs = summarizeMeetingAudience(config, groupIds);
  if (!programs.length) return [];

  return programs.flatMap((program) => {
    if (program.full) {
      return [
        {
          key: program.selector || program.title,
          label: program.title,
          selector: program.selector,
          mode: "program" as const,
          groupIds: groupIds
            .map((id) => String(id || "").trim())
            .filter(Boolean),
        },
      ];
    }

    const trackItems = program.tracks.flatMap((track) => {
      if (track.full) {
        return [
          {
            key: track.selector + track.title,
            label: track.title,
            selector: track.selector,
            mode: "track" as const,
            groupIds: [] as string[],
          },
        ];
      }
      return track.groups.map((group) => ({
        key: `${track.selector}-${group.code}`,
        label: group.title,
        selector: "",
        mode: "track" as const,
        groupIds: [group.code],
      }));
    });

    const flatItems = program.flatGroups.map((group) => ({
      key: `${program.programCode || "other"}-${group.code}`,
      label: group.title,
      selector: "",
      mode: "program" as const,
      groupIds: [group.code],
    }));

    return [...trackItems, ...flatItems];
  });
}
