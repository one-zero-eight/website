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
  outdated: boolean;
};

export const viewConfig: ViewConfig = {
  categories: {
    "core-courses": {
      alias: "core-courses",
      title: "Core Courses",
      shortDescription: "Academic schedule for core courses.",
      filtersTagTypes: ["core-courses"],
      groupingTagType: "core-courses",
      showTagTypes: ["core-courses"],
      outdated: false,
    },
    electives: {
      alias: "electives",
      title: "Electives",
      shortDescription: "Academic schedule for electives.",
      filtersTagTypes: ["electives"],
      groupingTagType: "electives",
      showTagTypes: ["electives"],
      outdated: false,
    },
    sports: {
      alias: "sports",
      title: "Sports",
      shortDescription: "Schedule of sport classes.",
      filtersTagTypes: [],
      groupingTagType: "category",
      showTagTypes: ["category"],
      outdated: false,
    },
    cleaning: {
      alias: "cleaning",
      title: "Cleaning",
      shortDescription: "Schedule of cleaning and linen change in dormitories.",
      filtersTagTypes: [],
      groupingTagType: "cleaning",
      showTagTypes: ["cleaning"],
      outdated: false,
    },
    bootcamp2026: {
      alias: "bootcamp2026",
      title: "Bootcamp",
      shortDescription: "Schedule of bootcamp activities in August, 2026.",
      filtersTagTypes: ["bootcamp2026"],
      groupingTagType: "bootcamp2026",
      showTagTypes: ["bootcamp2026"],
      outdated: false,
    },
  },
};

export function getCategoryInfoBySlug(slug: string) {
  return Object.values(viewConfig.categories).find((v) => v.alias === slug);
}
