export type ViewConfig = {
  types: Record<string, TypeInfo>;
};

export type TypeInfo = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  filters: TypeFilter[];
  showAdditionalInfo: string[];
};

export type TypeFilter = {
  alias: string;
  title: string;
  values: string[];
};

export const viewConfig: ViewConfig = {
  types: {
    "core course": {
      id: "core course",
      slug: "core-courses",
      title: "Core Courses",
      shortDescription: "Academic schedule for core courses in Sum23.",
      filters: [
        {
          alias: "course",
          title: "Course",
          values: [
            "BS - Year 1",
            "BS - Year 2",
            "BS - Year 3",
            "BS - Year 4",
            "MS - Year 1",
          ],
        },
      ],
      showAdditionalInfo: ["course"],
    },
    elective: {
      id: "elective",
      slug: "electives",
      title: "Electives",
      shortDescription: "Academic schedule for electives in Sum23.",
      filters: [
        {
          alias: "elective_type",
          title: "Elective type",
          values: ["BS Tech", "MS Tech", "BS/MS Hum"],
        },
      ],
      showAdditionalInfo: ["elective_type"],
    },
  },
};

export function getTypeInfoBySlug(slug: string) {
  return Object.values(viewConfig.types).find((v) => v.slug === slug);
}
