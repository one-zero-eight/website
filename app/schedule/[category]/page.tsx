import ScheduleList from "@/components/ScheduleList";
import {
  getCategories,
  getCategoryInfo,
  getCategoryInfoByCategories,
  getSchedule,
} from "@/lib/schedule/api";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { Navbar } from "@/components/Navbar";

export type Props = {
  params: { category: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const category = params.category;
  const categoryInfo = await getCategoryInfo(category);

  if (categoryInfo === undefined) {
    notFound();
  }

  return {
    title: categoryInfo.title + " " + ((await parent).title?.absolute || ""),
    alternates: { canonical: `/schedule/${category}` },
  };
}

export async function generateStaticParams() {
  const categories = await getCategories();
  if (categories === undefined) {
    notFound();
  }
  return categories.categories.map((categoryInfo) => ({
    category: categoryInfo.slug,
  }));
}

export default async function Page({ params }: Props) {
  const categories = await getCategories();
  if (categories === undefined) {
    notFound();
  }

  const categoryInfo = getCategoryInfoByCategories(params.category, categories);
  if (categoryInfo === undefined) {
    notFound();
  }

  const schedule = await getSchedule(params.category);
  if (schedule === undefined) {
    notFound();
  }

  return (
    <div className="px-2 xl:px-16 py-16 flex flex-col">
      <h1 className="lg:hidden lg:invisible text-center xl:text-left text-3xl xl:text-4xl font-bold">
        Schedule
      </h1>
      <p className="lg:hidden lg:invisible text-center xl:text-left text-white/75">
        Now find your group.
      </p>
      <Navbar className="hidden invisible lg:flex lg:visible">
        <h1 className="text-center xl:text-left text-3xl xl:text-4xl font-bold">
          Schedule
        </h1>
        <p className="text-center xl:text-left text-white/75">
          Now find your group.
        </p>
      </Navbar>
      <ScheduleList
        categories={categories}
        category={params.category}
        schedule={schedule}
      />
    </div>
  );
}
