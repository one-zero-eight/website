import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import { resolveCourseUsageTargets } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { buildProgramsGroupsTreeViewSectionTabs } from "@/components/schedule-assistant/settings/groups/programsGroupsTreeView.ts";
import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import type { SettingsListRow } from "@/components/schedule-assistant/settings/useSelection.tsx";

/** Курс в сводке по секциям на вкладке «Курсы» (id = `course-${courseIndex}`). */
export type CourseUsageRow = SettingsListRow & {
  courseIndex: number;
};

export type CourseUsageTrackGroup = {
  key: string;
  title: string;
  courses: CourseUsageRow[];
};

export type CourseUsageProgramGroup = {
  key: string;
  title: string;
  tracks: CourseUsageTrackGroup[];
};

export type CourseUsageSectionGroup = {
  key: string;
  title: string;
  programs: CourseUsageProgramGroup[];
};

function buildCourseUsageRows(
  config: SchemaScheduleConfig | null,
): CourseUsageRow[] {
  return (config?.courses || []).map(
    (course: SchemaCourseConfig, index: number) => {
      const components = (course?.components || [])
        .map((comp) => comp?.tag)
        .filter(Boolean);
      return {
        id: `course-${index}`,
        title:
          String(
            course?.name_ru ||
              course?.name ||
              course?.short_name_ru ||
              course?.short_name,
          ) || `Курс #${index + 1}`,
        subtitle: components.length ? components.join(", ") : "—",
        selection: { kind: "course", courseIndex: index },
        courseIndex: index,
      };
    },
  );
}

/** Дерево курсов по секциям конфига — только для UI вкладки «Курсы». */
export function buildCoursesTabSections(
  config: SchemaScheduleConfig | null,
): CourseUsageSectionGroup[] {
  const courseItems = buildCourseUsageRows(config);
  if (!courseItems.length) return [];

  const courseByIndex = new Map<number, CourseUsageRow>();
  for (const item of courseItems) {
    courseByIndex.set(item.courseIndex, item);
  }

  const groupToProgramTrack = new Map<
    string,
    { programId: string; programTitle: string; trackName: string }
  >();
  const programById = new Map<
    string,
    { title: string; trackNames: string[] }
  >();

  for (const section of getScheduleSections(config)) {
    if (!section?.code || !Array.isArray(section.programs)) continue;
    const sectionCode = String(section.code);
    for (const program of section.programs) {
      const programId = String(program?.code || "").trim();
      const programTitle = String(program?.name || programId || sectionCode);
      const normalizedTracks = normalizeTracksFromSectionProgram(program);
      if (programId) {
        programById.set(programId, {
          title: programTitle,
          trackNames: normalizedTracks.map((t) =>
            String(t?.name || "Без направления"),
          ),
        });
      }
      for (const track of normalizedTracks) {
        const trackName = String(track?.name || "Без направления");
        for (const groupId of track?.groups || []) {
          groupToProgramTrack.set(String(groupId), {
            programId,
            programTitle,
            trackName,
          });
        }
      }
    }
  }

  const usageMap = new Map<
    string,
    { title: string; tracks: Map<string, CourseUsageRow[]> }
  >();
  const unassigned: CourseUsageRow[] = [];

  for (const [courseIndex, course] of (config?.courses || []).entries()) {
    const courseName = String(course?.name || "").trim();
    if (!courseName) continue;
    const courseItem = courseByIndex.get(courseIndex);
    if (!courseItem) continue;

    const seenTargets = new Set<string>();
    for (const component of course?.components || []) {
      for (const target of component?.student_groups || []) {
        const rawTarget = String(target || "").trim();
        if (!rawTarget) continue;

        for (const resolved of resolveCourseUsageTargets(
          config,
          rawTarget,
          programById,
          groupToProgramTrack,
        )) {
          seenTargets.add(
            `${resolved.programId}|||${resolved.programTitle}|||${resolved.trackTitle}`,
          );
        }
      }
    }

    if (!seenTargets.size) {
      unassigned.push(courseItem);
      continue;
    }

    for (const target of seenTargets) {
      const [programId, programTitle, trackTitle] = target.split("|||");
      if (!usageMap.has(programId))
        usageMap.set(programId, { title: programTitle, tracks: new Map() });
      const trackMap = usageMap.get(programId)!.tracks;
      if (!trackMap.has(trackTitle)) trackMap.set(trackTitle, []);
      trackMap.get(trackTitle)!.push(courseItem);
    }
  }

  const groups: CourseUsageProgramGroup[] = Array.from(usageMap.entries())
    .map(([programId, payload]) => ({
      key: programId,
      title: payload.title,
      tracks: Array.from(payload.tracks.entries())
        .map(([trackTitle, courses]) => ({
          key: `${programId}-${trackTitle}`,
          title: trackTitle,
          courses: Array.from(
            new Map(courses.map((c) => [c.id, c])).values(),
          ).sort((a, b) => a.title.localeCompare(b.title, "ru")),
        }))
        .sort((a, b) => a.title.localeCompare(b.title, "ru")),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));

  if (unassigned.length) {
    groups.push({
      key: "unassigned",
      title: "Без привязки к программе",
      tracks: [
        {
          key: "unassigned-track",
          title: "Не определено",
          courses: Array.from(
            new Map(unassigned.map((c) => [c.id, c])).values(),
          ).sort((a, b) => a.title.localeCompare(b.title, "ru")),
        },
      ],
    });
  }

  const sections = buildProgramsGroupsTreeViewSectionTabs(config);
  const sectionToPrograms = new Map<string, CourseUsageProgramGroup[]>();
  const orderedSections: CourseUsageSectionGroup[] = [];
  for (const section of sections) {
    sectionToPrograms.set(section.code, []);
    orderedSections.push({
      key: section.code,
      title: section.name,
      programs: [],
    });
  }
  const programToSection = new Map<string, string>();
  for (const section of sections) {
    for (const programCode of section.programCodes) {
      programToSection.set(programCode, section.code);
    }
  }
  for (const group of groups) {
    const sectionCode = programToSection.get(group.key);
    if (!sectionCode) continue;
    sectionToPrograms.get(sectionCode)?.push(group);
  }
  for (const section of orderedSections) {
    section.programs = sectionToPrograms.get(section.key) || [];
  }

  return orderedSections;
}
