export const API_URL = process.env.API_URL;

export type Categories = {
  categories: CategoryInfo[];
};

export type CategoryInfo = {
  title: string;
  shortDescription: string;
  path: string;
  slug: string;
};

export async function getCategories() {
  const categories = (await fetch(`${API_URL}/schedule/categories.json`, {
    next: {
      revalidate: 60,
    },
  })
    .then((res) => res.json())
    .catch(() => {})) as Categories;
  if (categories === undefined) {
    return undefined;
  }
  categories.categories = categories.categories.sort((a, b) =>
    a.title > b.title ? 1 : b.title > a.title ? -1 : 0
  );
  return categories;
}

export async function getCategoryInfo(category: string) {
  const categories = await getCategories();
  if (categories === undefined) {
    return undefined;
  }
  return getCategoryInfoByCategories(category, categories);
}

export function getCategoryInfoByCategories(
  category: string,
  categories: Categories
) {
  const filtered = categories.categories.filter((v) => v.slug === category);
  return filtered.length > 0 ? filtered[0] : undefined;
}

export type Schedule = {
  title: string;
  calendars: Calendar[];
  filters: ScheduleFilter[];
};

export type Calendar = {
  name: string;
  file: string;
  [key: string]: string;
};

export type ScheduleFilter = {
  title: string;
  alias: string;
};

export async function getSchedule(category: string) {
  const schedule = (await fetch(`${API_URL}/schedule/${category}.json`, {
    next: {
      revalidate: 60,
    },
  })
    .then((res) => res.json())
    .catch(() => {})) as Schedule;
  if (schedule === undefined) {
    return undefined;
  }
  // Sort by name
  schedule.calendars = schedule.calendars.sort((a, b) =>
    a.name > b.name ? 1 : b.name > a.name ? -1 : 0
  );
  return schedule;
}

export async function getCalendarURL(category: string, group: string) {}
