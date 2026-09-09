import {
  SectionConfigDefault_layoutAnyOf0,
  type SchemaPublicTimetable,
} from "@/api/schedule-assistant/types.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";

/** Normalize optional display collections only; no private editor data is invented. */
export function publicTimetableConfig(
  data: SchemaPublicTimetable,
): TimetableViewConfig {
  return {
    ...data,
    term: {
      ...data.term,
      sections: (data.term.sections ?? []).map((section) => ({
        ...section,
        default_layout: section.default_layout
          ? SectionConfigDefault_layoutAnyOf0[section.default_layout]
          : null,
        programs: (section.programs ?? []).map((program) => ({
          ...program,
          groups: program.groups ?? [],
          tracks: (program.tracks ?? []).map((track) => ({
            ...track,
            groups: track.groups ?? [],
          })),
        })),
      })),
    },
    courses: (data.courses ?? []).map((course) => ({
      ...course,
      components: course.components.map((component) => ({
        ...component,
        audience: component.audience ?? [],
        sessions: component.sessions?.map((series) => ({
          ...series,
          audience: series.audience ?? [],
        })),
      })),
    })),
  };
}
