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
    bootcamp2024: {
      alias: "bootcamp2024",
      title: "Bootcamp",
      shortDescription: "Schedule of bootcamp activities in August, 2024.",
      filtersTagTypes: ["bootcamp2024"],
      groupingTagType: "bootcamp2024",
      showTagTypes: ["bootcamp2024", "bootcamp2024-workshops-timeslot"],
      outdated: false,
    },
    "bootcamp2024-workshops": {
      alias: "bootcamp2024-workshops",
      title: "Workshops",
      shortDescription: "Workshops on bootcamp in August, 2024.",
      filtersTagTypes: ["bootcamp2024-workshops"],
      groupingTagType: "bootcamp2024-workshops",
      showTagTypes: [
        "bootcamp2024-workshops",
        "bootcamp2024-workshops-timeslot",
      ],
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
    "core-courses": {
      alias: "core-courses",
      title: "Core Courses",
      shortDescription: "Academic schedule for core courses in Sum24.",
      filtersTagTypes: ["core-courses"],
      groupingTagType: "core-courses",
      showTagTypes: ["core-courses"],
      outdated: true,
    },
    electives: {
      alias: "electives",
      title: "Electives",
      shortDescription: "Academic schedule for electives in Sum24.",
      filtersTagTypes: ["electives"],
      groupingTagType: "electives",
      showTagTypes: ["electives"],
      outdated: true,
    },
    sports: {
      alias: "sports",
      title: "Sports",
      shortDescription: "Schedule of sport classes in Sum24.",
      filtersTagTypes: [],
      groupingTagType: undefined,
      showTagTypes: ["category"],
      outdated: true,
    },
  },
};

export function getCategoryInfoBySlug(slug: string) {
  return Object.values(viewConfig.categories).find((v) => v.alias === slug);
}
