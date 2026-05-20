import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/normalizeTrackFromSectionProgram.ts";
import type {
  ScheduleConfigDraft,
  ScheduleConfigProgram,
  ScheduleConfigSection,
  ScheduleConfigSectionProgram,
} from "@/components/schedule-assistant/settings/configTypes.ts";
import type { SettingsSelection } from "@/components/schedule-assistant/settings/useSelection.tsx";

/** Узел трека в tree view «программы и группы». */
export type ProgramTreeTrack = {
  key: string;
  name: string;
  selection: SettingsSelection;
  sectionCode: string;
  programIndex: number;
  trackIndex: number;
  groups: Array<{
    key: string;
    groupId: string;
    groupLabel: string;
    estimatedSize: number | null;
    studentsCount: number;
    selection: SettingsSelection;
    groupIndex: number;
  }>;
};

/** Узел программы в tree view «программы и группы». */
export type ProgramTreeProgram = {
  key: string;
  code: string;
  title: string;
  subtitle: string;
  selection: SettingsSelection;
  sectionCode: string;
  language: string;
  programIndex: number;
  tracks: ProgramTreeTrack[];
};

/** Секция конфига для табов (курсы / программы и группы). */
export type ProgramSection = {
  code: string;
  name: string;
  programCodes: string[];
};

function parseEstimatedSize(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function programStableId(
  program: ScheduleConfigSectionProgram | ScheduleConfigProgram,
): string {
  return String(program?.code || "").trim();
}

/**
 * Дерево программ/треков/групп для UI: обогащение `config.sections` данными из `students_groups`
 * и стабильные `itemId`. Проекция конфига в tree view, не отдельная сущность в YAML.
 */
export function buildProgramsGroupsTreeView(
  config: ScheduleConfigDraft | null,
): ProgramTreeProgram[] {
  const groupMetaById: Record<
    string,
    { name: string; estimatedSize: number | null; studentsCount: number }
  > = {};
  const studentsGroups = Array.isArray(config?.students_groups)
    ? config.students_groups
    : [];
  for (const group of studentsGroups) {
    groupMetaById[String(group?.code || "")] = {
      name: String(group?.name || group?.code || ""),
      estimatedSize: parseEstimatedSize(group?.estimated_size),
      studentsCount: Array.isArray(group?.students) ? group.students.length : 0,
    };
  }

  const rows: ProgramTreeProgram[] = [];
  const sections = Array.isArray(config?.sections) ? config.sections : [];

  for (const section of sections) {
    if (!section?.code || !Array.isArray(section?.programs)) continue;
    const sectionCode = String(section.code);
    for (const [programIndex, program] of section.programs.entries()) {
      const programIdentity = programStableId(program);
      const programSelection: SettingsSelection = {
        kind: "program",
        sectionCode,
        programIndex,
      };
      const tracks: ProgramTreeTrack[] = [];
      const normalizedTracks = normalizeTracksFromSectionProgram(program);

      for (const [trackIndex, track] of normalizedTracks.entries()) {
        const trackName = String(track?.name || "Трек");
        const trackSelection: SettingsSelection = {
          kind: "track",
          sectionCode,
          programIndex,
          trackIndex,
        };
        const groups: ProgramTreeTrack["groups"] = (track?.groups || []).map(
          (groupId: string, groupIndex: number) => ({
            key: String(groupId),
            groupId: String(groupId),
            groupLabel: groupMetaById[String(groupId)]?.name || String(groupId),
            estimatedSize:
              groupMetaById[String(groupId)]?.estimatedSize ?? null,
            studentsCount: groupMetaById[String(groupId)]?.studentsCount ?? 0,
            selection: {
              kind: "group",
              sectionCode,
              programIndex,
              trackIndex,
              groupId: String(groupId),
            },
            groupIndex,
          }),
        );
        tracks.push({
          key: `${programIdentity}-t${trackIndex}`,
          name: trackName,
          selection: trackSelection,
          sectionCode,
          programIndex,
          trackIndex,
          groups,
        });
      }

      rows.push({
        key: `${sectionCode}-${programIdentity}`,
        code: programIdentity,
        title: String(program?.name || programIdentity),
        subtitle: `Программа · ${sectionCode}`,
        selection: programSelection,
        sectionCode,
        language: String(program?.language || ""),
        programIndex,
        tracks,
      });
    }
  }
  return rows;
}

/** Табы секций для того же tree view (курсы / программы и группы). */
export function buildProgramsGroupsTreeViewSectionTabs(
  config: ScheduleConfigDraft | null,
): ProgramSection[] {
  const sectionsRaw = Array.isArray(config?.sections) ? config.sections : [];
  return sectionsRaw
    .map((section: ScheduleConfigSection) => {
      const sectionCode = String(section?.code || "").trim();
      const sectionName = String(section?.name || section?.code || "").trim();
      const programs = Array.isArray(section?.programs) ? section.programs : [];
      const programCodes = programs
        .map((p) => programStableId(p))
        .filter(Boolean);
      if (!sectionCode || !sectionName) return null;
      return {
        code: sectionCode,
        name: sectionName,
        programCodes,
      };
    })
    .filter((section: ProgramSection | null): section is ProgramSection =>
      Boolean(section),
    );
}
