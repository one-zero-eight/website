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
    /*
    bootcamp2024: {
      alias: "bootcamp2024",
      title: "Bootcamp",
      shortDescription: "Schedule of bootcamp activities in August, 2024.",
      filtersTagTypes: ["bootcamp2024"],
      groupingTagType: "bootcamp2024",
      showTagTypes: ["bootcamp2024", "bootcamp2024-workshops-timeslot"],
      outdated: true,
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
      outdated: true,
    },
    */
  },
};

export function getCategoryInfoBySlug(slug: string) {
  return Object.values(viewConfig.categories).find((v) => v.alias === slug);
}
