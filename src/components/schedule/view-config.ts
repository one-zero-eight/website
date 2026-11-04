export type ViewConfig = {
  categories: Record<string, CategoryInfo>;
};

export type CategoryInfo = {
  alias: string;
  title: string;
  titleRu: string;
  shortDescription: string;
  shortDescriptionRu: string;
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
      titleRu: "Основные курсы",
      shortDescription: "Academic schedule for core courses.",
      shortDescriptionRu: "Учебное расписание основных курсов.",
      filtersTagTypes: ["core-courses"],
      groupingTagType: "core-courses",
      showTagTypes: ["core-courses"],
      outdated: false,
    },
    electives: {
      alias: "electives",
      title: "Electives",
      titleRu: "Элективы",
      shortDescription: "Academic schedule for electives.",
      shortDescriptionRu: "Учебное расписание элективов.",
      filtersTagTypes: ["electives"],
      groupingTagType: "electives",
      showTagTypes: ["electives"],
      outdated: false,
    },
    sports: {
      alias: "sports",
      title: "Sports",
      titleRu: "Спорт",
      shortDescription: "Schedule of sport classes.",
      shortDescriptionRu: "Расписание спортивных занятий.",
      filtersTagTypes: [],
      groupingTagType: "category",
      showTagTypes: ["category"],
      outdated: false,
    },
    cleaning: {
      alias: "cleaning",
      title: "Cleaning",
      titleRu: "Уборка",
      shortDescription: "Schedule of cleaning and linen change in dormitories.",
      shortDescriptionRu: "Расписание уборки и смены белья в общежитиях.",
      filtersTagTypes: [],
      groupingTagType: "cleaning",
      showTagTypes: ["cleaning"],
      outdated: false,
    },
    bootcamp2026: {
      alias: "bootcamp2026",
      title: "Bootcamp",
      titleRu: "Буткемп",
      shortDescription: "Schedule of bootcamp activities in August, 2026.",
      shortDescriptionRu: "Расписание мероприятий буткемпа в августе 2026.",
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

export function getCategoryTitle(
  category: CategoryInfo,
  locale: string,
): string {
  return locale === "ru" ? category.titleRu : category.title;
}

export function getCategoryShortDescription(
  category: CategoryInfo,
  locale: string,
): string {
  return locale === "ru"
    ? category.shortDescriptionRu
    : category.shortDescription;
}
