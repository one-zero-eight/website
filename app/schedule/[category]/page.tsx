import { Navbar } from "@/components/Navbar";
import ScheduleList from "@/components/ScheduleList";
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

export default async function Page({ params }: Props) {
  return (
    <div className="flex flex-col items-center px-4 py-16 lg:px-12 lg:[align-items:normal]">
      <h1 className="text-center text-3xl font-bold text-text-main xl:text-left xl:text-4xl lgw-smh:invisible lgw-smh:hidden">
        Schedule
      </h1>
      <p className="text-center text-text-secondary/75 xl:text-left lgw-smh:invisible lgw-smh:hidden">
        Now find your group.
      </p>
      <Navbar>
        <h1 className="text-center text-3xl font-bold text-text-main lg:text-left lg:text-4xl">
          Schedule
        </h1>
        <p className="text-center text-text-secondary/75 xl:text-left">
          Now find your group.
        </p>
      </Navbar>
      <ScheduleList category={params.category} />
    </div>
  );
}
