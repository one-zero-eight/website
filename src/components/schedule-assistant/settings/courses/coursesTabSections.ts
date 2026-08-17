import {
  normalizeTracksFromSectionProgram,
  programUsesExplicitTracks,
} from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
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

/** Курсы, привязанные к конкретной студенческой группе. */
export type CourseUsageGroupBucket = {
  key: string;
  groupId: string;
  title: string;
  courses: CourseUsageRow[];
};

export type CourseUsageTrackGroup = {
  key: string;
  title: string;
  /** Курсы с аудиторией на уровне трека (`@program/track`). */
  courses: CourseUsageRow[];
  /** Курсы с аудиторией — конкретная группа. */
  groups: CourseUsageGroupBucket[];
};

export type CourseUsageProgramGroup = {
  key: string;
  title: string;
  /** True when program has real `tracks[]` (not only top-level groups). */
  hasExplicitTracks: boolean;
  /** Курсы с аудиторией на всю программу (`@program`) — общие для треков. */
  sharedCourses: CourseUsageRow[];
  tracks: CourseUsageTrackGroup[];
};

export type CourseUsageSectionGroup = {
  key: string;
  title: string;
  /** Courses in this section without a resolvable program/track audience. */
  looseCourses: CourseUsageRow[];
  programs: CourseUsageProgramGroup[];
};

type TrackUsageBucket = {
  courses: CourseUsageRow[];
  groups: Map<string, { title: string; courses: CourseUsageRow[] }>;
};

function dedupeCourses(courses: CourseUsageRow[]): CourseUsageRow[] {
  return Array.from(new Map(courses.map((c) => [c.id, c])).values()).sort(
    (a, b) => a.title.localeCompare(b.title, "ru"),
  );
}

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
export type CoursesTabSectionsResult = {
  sections: CourseUsageSectionGroup[];
};

export function buildCoursesTabSections(
  config: SchemaScheduleConfig | null,
): CoursesTabSectionsResult {
  const courseItems = buildCourseUsageRows(config);
  if (!courseItems.length) return { sections: [] };

  const courseByIndex = new Map<number, CourseUsageRow>();
  for (const item of courseItems) {
    courseByIndex.set(item.courseIndex, item);
  }

  const groupNameById = new Map<string, string>();
  for (const group of config?.students_groups || []) {
    const code = String(group?.code || "").trim();
    if (!code) continue;
    groupNameById.set(code, String(group?.name || code));
  }

  const groupToProgramTrack = new Map<
    string,
    {
      programId: string;
      programTitle: string;
      trackName: string;
      groupTitle: string;
      hasExplicitTracks: boolean;
    }
  >();
  const programById = new Map<
    string,
    { title: string; trackNames: string[]; hasExplicitTracks: boolean }
  >();
  const programHasExplicitTracks = new Map<string, boolean>();
  const programToSectionCode = new Map<string, string>();

  for (const section of getScheduleSections(config)) {
    if (!section?.code || !Array.isArray(section.programs)) continue;
    const sectionCode = String(section.code);
    for (const program of section.programs) {
      const programId = String(program?.code || "").trim();
      const programTitle = String(program?.name || programId || sectionCode);
      const hasExplicitTracks = programUsesExplicitTracks(program);
      const normalizedTracks = normalizeTracksFromSectionProgram(program);
      if (programId) {
        programHasExplicitTracks.set(programId, hasExplicitTracks);
        programById.set(programId, {
          title: programTitle,
          trackNames: normalizedTracks.map((t) =>
            String(t?.name || "Без направления"),
          ),
          hasExplicitTracks,
        });
        programToSectionCode.set(programId, sectionCode);
      }
      for (const track of normalizedTracks) {
        const trackName = String(track?.name || "Без направления");
        for (const groupId of track?.groups || []) {
          const id = String(groupId);
          groupToProgramTrack.set(id, {
            programId,
            programTitle,
            trackName,
            groupTitle: groupNameById.get(id) || id,
            hasExplicitTracks,
          });
        }
      }
    }
  }

  const usageBySection = new Map<
    string,
    {
      title: string;
      looseCourses: CourseUsageRow[];
      usageMap: Map<
        string,
        {
          title: string;
          sharedCourses: CourseUsageRow[];
          tracks: Map<string, TrackUsageBucket>;
        }
      >;
    }
  >();
  const sectionTabs = buildProgramsGroupsTreeViewSectionTabs(config);
  const knownSectionCodes = new Set(sectionTabs.map((section) => section.code));
  for (const section of sectionTabs) {
    usageBySection.set(section.code, {
      title: section.name,
      looseCourses: [],
      usageMap: new Map(),
    });
  }

  function ensureProgram(
    sectionCode: string,
    programId: string,
    programTitle: string,
  ) {
    const sectionBucket = usageBySection.get(sectionCode)!;
    if (!sectionBucket.usageMap.has(programId))
      sectionBucket.usageMap.set(programId, {
        title: programTitle,
        sharedCourses: [],
        tracks: new Map(),
      });
    return sectionBucket.usageMap.get(programId)!;
  }

  function ensureTrack(
    sectionCode: string,
    programId: string,
    programTitle: string,
    trackTitle: string,
  ): TrackUsageBucket {
    const program = ensureProgram(sectionCode, programId, programTitle);
    if (!program.tracks.has(trackTitle))
      program.tracks.set(trackTitle, { courses: [], groups: new Map() });
    return program.tracks.get(trackTitle)!;
  }

  for (const [courseIndex, course] of (config?.courses || []).entries()) {
    const courseName = String(course?.name || "").trim();
    if (!courseName) continue;
    const courseItem = courseByIndex.get(courseIndex);
    if (!courseItem) continue;

    const sectionCode = course.section_code;
    if (!knownSectionCodes.has(sectionCode)) continue;

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
          const programSection = programToSectionCode.get(resolved.programId);
          if (programSection && programSection !== sectionCode) continue;
          seenTargets.add(
            [
              resolved.programId,
              resolved.programTitle,
              resolved.trackTitle || "",
              resolved.groupId || "",
              resolved.groupTitle || "",
            ].join("|||"),
          );
        }
      }
    }

    if (!seenTargets.size) {
      usageBySection.get(sectionCode)?.looseCourses.push(courseItem);
      continue;
    }

    const resolvedTargets = [...seenTargets].map((target) => {
      const [programId, programTitle, trackTitle, groupId, groupTitle] =
        target.split("|||");
      return { programId, programTitle, trackTitle, groupId, groupTitle };
    });

    // Prefer broadest audience: program-level hides track/group; track-level hides groups.
    const programsWithShared = new Set(
      resolvedTargets
        .filter((target) => !target.trackTitle)
        .map((target) => target.programId),
    );
    const tracksWithTrackLevel = new Set(
      resolvedTargets
        .filter((target) => target.trackTitle && !target.groupId)
        .map((target) => `${target.programId}|||${target.trackTitle}`),
    );

    for (const target of resolvedTargets) {
      if (programsWithShared.has(target.programId) && target.trackTitle) {
        continue;
      }
      if (
        target.groupId &&
        tracksWithTrackLevel.has(`${target.programId}|||${target.trackTitle}`)
      ) {
        continue;
      }
      if (!target.trackTitle) {
        ensureProgram(
          sectionCode,
          target.programId,
          target.programTitle,
        ).sharedCourses.push(courseItem);
        continue;
      }
      const trackBucket = ensureTrack(
        sectionCode,
        target.programId,
        target.programTitle,
        target.trackTitle,
      );
      if (target.groupId) {
        if (!trackBucket.groups.has(target.groupId))
          trackBucket.groups.set(target.groupId, {
            title: target.groupTitle || target.groupId,
            courses: [],
          });
        trackBucket.groups.get(target.groupId)!.courses.push(courseItem);
      } else {
        trackBucket.courses.push(courseItem);
      }
    }
  }

  const orderedSections: CourseUsageSectionGroup[] = [];
  for (const section of sectionTabs) {
    const bucket = usageBySection.get(section.code);
    if (!bucket) continue;
    const programs: CourseUsageProgramGroup[] = Array.from(
      bucket.usageMap.entries(),
    )
      .map(([programId, payload]) => ({
        key: programId,
        title: payload.title,
        hasExplicitTracks: programHasExplicitTracks.get(programId) ?? true,
        sharedCourses: dedupeCourses(payload.sharedCourses),
        tracks: Array.from(payload.tracks.entries())
          .map(([trackTitle, trackBucket]) => ({
            key: `${programId}-${trackTitle}`,
            title: trackTitle,
            courses: dedupeCourses(trackBucket.courses),
            groups: Array.from(trackBucket.groups.entries())
              .map(([groupId, groupBucket]) => ({
                key: `${programId}-${trackTitle}-${groupId}`,
                groupId,
                title: groupBucket.title,
                courses: dedupeCourses(groupBucket.courses),
              }))
              .sort((a, b) => a.title.localeCompare(b.title, "ru")),
          }))
          .sort((a, b) => a.title.localeCompare(b.title, "ru")),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));

    orderedSections.push({
      key: section.code,
      title: section.name,
      looseCourses: dedupeCourses(bucket.looseCourses),
      programs,
    });
  }

  return { sections: orderedSections };
}
