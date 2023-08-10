export type TagInfo = {
  alias: string;
  name: string;
  type?: string;
};

export const tags: TagInfo[] = [
  {
    alias: "core-courses",
    name: "Core Courses",
    type: "category",
  },
  {
    alias: "sports",
    name: "Sports",
    type: "category",
  },
  {
    alias: "electives",
    name: "Electives",
    type: "category",
  },
  {
    alias: "bs-year-1",
    name: "BS - Year 1",
    type: "core-courses",
  },
  {
    alias: "bs-year-2",
    name: "BS - Year 2",
    type: "core-courses",
  },
  {
    alias: "bs-year-3",
    name: "BS - Year 3",
    type: "core-courses",
  },
  {
    alias: "bs-year-4",
    name: "BS - Year 4",
    type: "core-courses",
  },
  {
    alias: "ms-year-1",
    name: "MS - Year 1",
    type: "core-courses",
  },
  {
    alias: "bs-tech",
    name: "BS Tech",
    type: "electives",
  },
  {
    alias: "ms-tech",
    name: "MS Tech",
    type: "electives",
  },
  {
    alias: "bs-ms-hum",
    name: "BS/MS Hum",
    type: "electives",
  },
];

export function getTagInfo(alias: string): TagInfo | undefined {
  return tags.find((tag) => tag.alias === alias);
}

export function getTagInfoByType(type: string): TagInfo[] {
  return tags.filter((tag) => tag.type === type);
}
