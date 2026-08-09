import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { parseStudentGroupSelector } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import {
  normalizeTracksFromSectionProgram,
  programUsesExplicitTracks,
} from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import { useMemo } from "react";

type AudienceTreeMode = "program" | "track" | "shared";

type AudienceTreeTrack = {
  name: string;
  groups: string[];
};

type AudienceTree = {
  mode: AudienceTreeMode;
  programTitle: string;
  /** Flat group list when program has no explicit tracks. */
  flatGroups?: string[];
  tracks: AudienceTreeTrack[];
};

function findProgram(config: SchemaScheduleConfig, programCode: string) {
  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      if (String(program.code || "").trim() === programCode) return program;
    }
  }
  return null;
}

function groupLabel(config: SchemaScheduleConfig, groupId: string): string {
  for (const group of config.students_groups || []) {
    if (String(group.code || "") === groupId) {
      return String(group.name || group.code || groupId);
    }
  }
  return groupId;
}

function buildAudienceTree(
  config: SchemaScheduleConfig,
  selector: string,
  mode: AudienceTreeMode,
): AudienceTree | null {
  const parsed = parseStudentGroupSelector(selector);
  if (!parsed) return null;
  const program = findProgram(config, parsed.programCode);
  if (!program) return null;

  const programTitle = String(
    program.name || program.code || parsed.programCode,
  );
  const hasExplicitTracks = programUsesExplicitTracks(program);
  const tracks = normalizeTracksFromSectionProgram(program);

  if (!hasExplicitTracks) {
    const groups = [
      ...tracks.flatMap((track) => (track.groups || []).map(String)),
      ...(Array.isArray(program.groups) && !tracks.length
        ? program.groups.map(String)
        : []),
    ];
    return {
      mode,
      programTitle,
      flatGroups: groups,
      tracks: [],
    };
  }

  if (parsed.kind === "program_track" || mode === "track") {
    const trackRef = parsed.kind === "program_track" ? parsed.trackRef : "";
    const track = tracks.find((candidate) => {
      const code = String(candidate.code || "")
        .trim()
        .toLowerCase();
      const name = String(candidate.name || "")
        .trim()
        .toLowerCase();
      const ref = trackRef.trim().toLowerCase();
      return code === ref || name === ref;
    });
    if (!track) return null;
    return {
      mode: "track",
      programTitle,
      tracks: [
        {
          name: String(track.name || trackRef),
          groups: (track.groups || []).map(String),
        },
      ],
    };
  }

  return {
    mode,
    programTitle,
    tracks: tracks.map((track) => ({
      name: String(track.name || "Трек"),
      groups: (track.groups || []).map(String),
    })),
  };
}

function AudienceTreeTooltipContent({
  config,
  tree,
}: {
  config: SchemaScheduleConfig;
  tree: AudienceTree;
}) {
  if (tree.flatGroups) {
    return (
      <div className="flex max-w-sm flex-col gap-0.5 font-mono text-xs leading-snug whitespace-pre-wrap">
        <div>{`Программа ${tree.programTitle}`}</div>
        {tree.flatGroups.map((groupId) => (
          <div key={groupId}>{`  ${groupLabel(config, groupId)}`}</div>
        ))}
      </div>
    );
  }

  if (tree.mode === "track") {
    const track = tree.tracks[0];
    if (!track) return null;
    return (
      <div className="flex max-w-sm flex-col gap-0.5 font-mono text-xs leading-snug whitespace-pre-wrap">
        <div>{`Трек ${track.name}`}</div>
        {track.groups.map((groupId) => (
          <div key={groupId}>{`  ${groupLabel(config, groupId)}`}</div>
        ))}
      </div>
    );
  }

  if (tree.mode === "shared") {
    return (
      <div className="flex max-w-sm flex-col gap-0.5 font-mono text-xs leading-snug whitespace-pre-wrap">
        <div>{`Общие · ${tree.programTitle}`}</div>
        {tree.tracks.map((track) => (
          <div key={track.name}>
            <div>{`  ${track.name}`}</div>
            {track.groups.map((groupId) => (
              <div key={groupId}>{`    ${groupLabel(config, groupId)}`}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-0.5 font-mono text-xs leading-snug whitespace-pre-wrap">
      <div>{`Программа ${tree.programTitle}`}</div>
      {tree.tracks.map((track) => (
        <div key={track.name}>
          <div>{`  ${track.name}`}</div>
          {track.groups.map((groupId) => (
            <div key={groupId}>{`    ${groupLabel(config, groupId)}`}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function AudienceTreeInfoIcon({
  config,
  selector,
  mode = "program",
}: {
  config: SchemaScheduleConfig;
  selector: string;
  mode?: AudienceTreeMode;
}) {
  const tree = useMemo(
    () => buildAudienceTree(config, selector, mode),
    [config, mode, selector],
  );

  if (!tree) return null;
  if (!tree.flatGroups?.length && !tree.tracks.length) return null;

  return (
    <Tooltip
      content={<AudienceTreeTooltipContent config={config} tree={tree} />}
    >
      <span className="icon-[material-symbols--info-outline-rounded] text-base-content/45 hover:text-base-content/70 inline-block shrink-0 cursor-help text-sm leading-none" />
    </Tooltip>
  );
}

export type GroupProgramTrack = {
  groupId: string;
  groupTitle: string;
  programCode: string;
  programTitle: string;
  trackTitle: string | null;
  hasExplicitTracks: boolean;
};

/** Resolve program (+ track when used) for concrete student group ids. */
export function resolveGroupsProgramTrack(
  config: SchemaScheduleConfig,
  groupIds: string[],
): GroupProgramTrack[] {
  const groupNameById = new Map(
    (config.students_groups ?? []).map((group) => [
      String(group.code || "").trim(),
      String(group.name || group.code || "").trim(),
    ]),
  );
  const byGroup = new Map<string, GroupProgramTrack>();

  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      const programCode = String(program.code || "").trim();
      if (!programCode) continue;
      const programTitle = String(
        program.name || program.code || programCode,
      ).trim();
      const hasExplicitTracks = programUsesExplicitTracks(program);
      for (const track of normalizeTracksFromSectionProgram(program)) {
        const trackTitle =
          String(track.name || track.code || "").trim() || null;
        for (const rawId of track.groups || []) {
          const groupId = String(rawId || "").trim();
          if (!groupId || byGroup.has(groupId)) continue;
          byGroup.set(groupId, {
            groupId,
            groupTitle: groupNameById.get(groupId) || groupId,
            programCode,
            programTitle,
            trackTitle: hasExplicitTracks ? trackTitle : null,
            hasExplicitTracks,
          });
        }
      }
    }
  }

  return groupIds
    .map((id) => String(id || "").trim())
    .filter(Boolean)
    .map(
      (groupId) =>
        byGroup.get(groupId) ?? {
          groupId,
          groupTitle: groupNameById.get(groupId) || groupId,
          programCode: "",
          programTitle: "—",
          trackTitle: null,
          hasExplicitTracks: false,
        },
    );
}

function GroupHierarchyTooltipContent({
  memberships,
}: {
  memberships: GroupProgramTrack[];
}) {
  if (!memberships.length) return null;

  return (
    <div className="flex max-w-sm flex-col gap-0.5 font-mono text-xs leading-snug whitespace-pre-wrap">
      {memberships.map((item) => (
        <div key={item.groupId}>
          <div>{`Программа ${item.programTitle}`}</div>
          {item.trackTitle ? <div>{`  Трек ${item.trackTitle}`}</div> : null}
          <div>{`  ${item.trackTitle ? "  " : ""}${item.groupTitle}`}</div>
        </div>
      ))}
    </div>
  );
}

/** Info icon for concrete groups — shows program / track membership. */
export function GroupHierarchyInfoIcon({
  config,
  groupIds,
}: {
  config: SchemaScheduleConfig;
  groupIds: string[];
}) {
  const memberships = useMemo(
    () => resolveGroupsProgramTrack(config, groupIds),
    [config, groupIds],
  );

  if (!memberships.length) return null;

  return (
    <Tooltip
      content={<GroupHierarchyTooltipContent memberships={memberships} />}
    >
      <span className="icon-[material-symbols--info-outline-rounded] text-base-content/45 hover:text-base-content/70 inline-block shrink-0 cursor-help text-sm leading-none" />
    </Tooltip>
  );
}
