import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import type {
  SchemaScheduleConfig,
  SchemaSectionProgram,
} from "@/api/schedule-assistant/types.ts";
import type {
  SettingsSelection,
  SettingsSubTab,
} from "@/components/schedule-assistant/settings/useSelection.tsx";

/** Выбранный узел дерева программ/групп по `itemId` (панель деталей). */
export type ProgramTreeSelection =
  | {
      kind: "program";
      sectionCode: string;
      programIndex: number;
      headingTitle: string;
      headingSubtitle?: string;
    }
  | {
      kind: "track";
      sectionCode: string;
      programIndex: number;
      trackIndex: number;
      headingTitle: string;
      headingSubtitle?: string;
      titleFallback: string;
    }
  | {
      kind: "group";
      groupId: string;
      sectionCode: string;
      programIndex: number;
      trackIndex: number;
      headingTitle: string;
      headingSubtitle?: string;
      titleFallback: string;
    };
function programStableId(program: SchemaSectionProgram): string {
  return String(program?.code || "").trim();
}

function getGroupDisplayLabel(
  config: SchemaScheduleConfig | null,
  groupId: string,
): string {
  const list = Array.isArray(config?.students_groups)
    ? config.students_groups
    : [];
  for (const g of list) {
    if (String(g?.code || "") === String(groupId)) {
      return String(g?.name || g?.code || groupId);
    }
  }
  return String(groupId);
}

function findSectionProgram(
  config: SchemaScheduleConfig | null,
  sectionCode: string,
  programIndex: number,
) {
  const sections = Array.isArray(config?.sections) ? config.sections : [];
  const section = sections.find((s) => String(s.code) === String(sectionCode));
  const programs = section?.programs;
  if (
    !Array.isArray(programs) ||
    programIndex < 0 ||
    programIndex >= programs.length
  )
    return null;
  return programs[programIndex] ?? null;
}

/** Соответствие выбранного узла дерева групп данным конфига (без построения дерева). */
export function resolveGroupsSelection(
  config: SchemaScheduleConfig | null,
  selection: SettingsSelection | null,
): ProgramTreeSelection | null {
  if (
    !selection ||
    (selection.kind !== "program" &&
      selection.kind !== "track" &&
      selection.kind !== "group")
  )
    return null;
  if (config == null) return null;

  if (selection.kind === "group") {
    const program = findSectionProgram(
      config,
      selection.sectionCode,
      selection.programIndex,
    );
    if (!program) return null;
    const tracks = normalizeTracksFromSectionProgram(program);
    const track = tracks[selection.trackIndex];
    if (!track?.groups?.includes(selection.groupId)) return null;
    const trackName = String(track.name || "Трек");
    const label = getGroupDisplayLabel(config, selection.groupId);
    return {
      kind: "group",
      groupId: selection.groupId,
      sectionCode: selection.sectionCode,
      programIndex: selection.programIndex,
      trackIndex: selection.trackIndex,
      headingTitle: label,
      headingSubtitle: `Группа · ${trackName}`,
      titleFallback: label,
    };
  }

  if (selection.kind === "track") {
    const program = findSectionProgram(
      config,
      selection.sectionCode,
      selection.programIndex,
    );
    if (!program) return null;
    const tracks = normalizeTracksFromSectionProgram(program);
    const track = tracks[selection.trackIndex];
    if (!track) return null;
    const programTitle = String(program.name || programStableId(program));
    const trackName = String(track.name || "Трек");
    return {
      kind: "track",
      sectionCode: selection.sectionCode,
      programIndex: selection.programIndex,
      trackIndex: selection.trackIndex,
      headingTitle: trackName,
      headingSubtitle: `Трек · ${programTitle}`,
      titleFallback: trackName,
    };
  }

  if (selection.kind === "program") {
    const program = findSectionProgram(
      config,
      selection.sectionCode,
      selection.programIndex,
    );
    if (!program) return null;
    const programIdentity = programStableId(program);
    return {
      kind: "program",
      sectionCode: selection.sectionCode,
      programIndex: selection.programIndex,
      headingTitle: String(program.name || programIdentity),
      headingSubtitle: `Программа · ${selection.sectionCode}`,
    };
  }

  return null;
}

export function isSettingsSelectionValid(
  config: SchemaScheduleConfig | null,
  tab: SettingsSubTab,
  selection: SettingsSelection | null,
): boolean {
  if (selection == null) return true;
  if (tab === "semester") return true;

  if (tab === "courses") {
    if (selection.kind !== "course") return false;
    const idx = selection.courseIndex;
    const courses = config?.courses;
    return (
      Array.isArray(courses) &&
      Number.isInteger(idx) &&
      idx >= 0 &&
      idx < courses.length
    );
  }
  if (tab === "instructors") {
    if (selection.kind !== "instructor") return false;
    const idx = selection.instructorIndex;
    const instructors = config?.instructors;
    return (
      Array.isArray(instructors) &&
      Number.isInteger(idx) &&
      idx >= 0 &&
      idx < instructors.length
    );
  }
  if (tab === "rooms") {
    if (selection.kind !== "room") return false;
    const idx = selection.roomIndex;
    const rooms = config?.rooms;
    return (
      Array.isArray(rooms) &&
      Number.isInteger(idx) &&
      idx >= 0 &&
      idx < rooms.length
    );
  }
  if (tab === "groups") {
    return resolveGroupsSelection(config, selection) != null;
  }
  return true;
}
