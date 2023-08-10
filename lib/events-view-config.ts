export type ViewConfig = {
  categories: Record<string, CategoryInfo>;
};

export type CategoryInfo = {
  alias: string;
  title: string;
  shortDescription: string;
  filtersTagTypes: string[];
  groupingTagType?: string;
  showTagTypes: string[];
};

export const viewConfig: ViewConfig = {
  categories: {
    "core-courses": {
      alias: "core-courses",
      title: "Core Courses",
      shortDescription: "Academic schedule for core courses in Sum23.",
      filtersTagTypes: ["core-courses"],
      groupingTagType: "core-courses",
      showTagTypes: ["core-courses"],
    },
    electives: {
      alias: "electives",
      title: "Electives",
      shortDescription: "Academic schedule for electives in Sum23.",
      filtersTagTypes: ["electives"],
      groupingTagType: "electives",
      showTagTypes: ["electives"],
    },
    sports: {
      alias: "sports",
      title: "Sports",
      shortDescription: "Schedule of sport classes in Sum23.",
      filtersTagTypes: [],
      groupingTagType: undefined,
      showTagTypes: [],
    },
  },
};

export function getCategoryInfoBySlug(slug: string) {
  return Object.values(viewConfig.categories).find((v) => v.alias === slug);
}
