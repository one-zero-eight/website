import { NavbarTemplate } from "@/components/layout/Navbar";
import ScheduleList from "@/components/schedule/ScheduleList";
import { getCategoryInfoBySlug, viewConfig } from "@/lib/events-view-config";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

export type Props = {
  params: { category: string };
};

export async function generateMetadata(
  { params: { category } }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const categoryInfo = getCategoryInfoBySlug(category);

  if (categoryInfo === undefined) {
    notFound();
  }

  return {
    title: categoryInfo.title + " " + ((await parent).title?.absolute || ""),
    description:
      categoryInfo.shortDescription +
      " Find your group in this category and see the calendar with all classes.",
    alternates: { canonical: `/schedule/${category}` },
  };
}

export async function generateStaticParams() {
  return Object.values(viewConfig.categories).map((typeInfo) => ({
    category: typeInfo.alias,
  }));
}

export default async function Page({ params: { category } }: Props) {
  const categoryInfo = getCategoryInfoBySlug(category);

  return (
    <div className="flex flex-col p-4 @lg/main:p-12">
      <NavbarTemplate
        title={`Schedule${
          categoryInfo?.title ? " — " + categoryInfo.title : ""
        }`}
        description={categoryInfo?.shortDescription}
      />
      <ScheduleList category={category} />
    </div>
  );
}
