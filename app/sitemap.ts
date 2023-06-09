import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://innohassle.ru",
      lastModified: new Date(),
    },
    {
      url: "https://innohassle.ru/schedule",
      lastModified: new Date(),
    },
  ];
}
