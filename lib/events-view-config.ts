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
      shortDescription: "Academic schedule for core courses in F23.",
      filtersTagTypes: ["core-courses"],
      groupingTagType: "core-courses",
      showTagTypes: ["core-courses"],
      outdated: false,
    },
    // electives: {
    //   alias: "electives",
    //   title: "Electives",
    //   shortDescription: "Academic schedule for electives in F23.",
    //   filtersTagTypes: ["electives"],
    //   groupingTagType: "electives",
    //   showTagTypes: ["electives"],
    //   outdated: false,
    // },
    sports: {
      alias: "sports",
      title: "Sports",
      shortDescription: "Schedule of sport classes in F23.",
      filtersTagTypes: [],
      groupingTagType: undefined,
      showTagTypes: ["category"],
      outdated: false,
    },
    // bootcamp2023: {
    //   alias: "bootcamp2023",
    //   title: "Bootcamp",
    //   shortDescription: "Schedule of bootcamp activities in August, 2023.",
    //   filtersTagTypes: ["bootcamp2023"],
    //   groupingTagType: "bootcamp2023",
    //   showTagTypes: ["bootcamp2023", "bootcamp2023-workshops-timeslot"],
    //   outdated: true,
    // },
    // "bootcamp2023-workshops": {
    //   alias: "bootcamp2023-workshops",
    //   title: "Workshops",
    //   shortDescription: "Workshops on bootcamp in August, 2023.",
    //   filtersTagTypes: ["bootcamp2023-workshops"],
    //   groupingTagType: "bootcamp2023-workshops",
    //   showTagTypes: [
    //     "bootcamp2023-workshops",
    //     "bootcamp2023-workshops-timeslot",
    //   ],
    //   outdated: true,
    // },
  },
};

export function getCategoryInfoBySlug(slug: string) {
  return Object.values(viewConfig.categories).find((v) => v.alias === slug);
}
