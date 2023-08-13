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
  {
    alias: "sum23",
    name: "Sum23 semester",
    type: "semester",
  },
  {
    alias: "bootcamp2023",
    name: "Bootcamp 2023",
    type: "category",
  },
  {
    alias: "academic",
    name: "Academic schedule for Bootcamp 2023",
    type: "bootcamp2023",
  },
  {
    alias: "buddy",
    name: "Meetings with buddies on Bootcamp 2023",
    type: "bootcamp2023",
  },
  {
    alias: "bootcamp2023-workshops",
    type: "category",
    name: "Workshops on Bootcamp 2023",
  },
  {
    alias: "bootcamp2023-workshops-14",
    type: "bootcamp2023-workshops",
    name: "Monday",
  },
  {
    alias: "bootcamp2023-workshops-15",
    type: "bootcamp2023-workshops",
    name: "Tuesday",
  },
  {
    alias: "bootcamp2023-workshops-16",
    type: "bootcamp2023-workshops",
    name: "Wednesday",
  },
  {
    alias: "bootcamp2023-workshops-17",
    type: "bootcamp2023-workshops",
    name: "Thursday",
  },
  {
    alias: "bootcamp2023-workshops-18",
    type: "bootcamp2023-workshops",
    name: "Friday",
  },
];

export function getTagInfo(alias: string): TagInfo | undefined {
  return tags.find((tag) => tag.alias === alias);
}

export function getTagInfoByType(type: string): TagInfo[] {
  return tags.filter((tag) => tag.type === type);
}
