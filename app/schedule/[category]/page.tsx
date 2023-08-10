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
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const categoryInfo = getCategoryInfoBySlug(params.category);

  if (categoryInfo === undefined) {
    notFound();
  }

  return {
    title: categoryInfo.title + " " + ((await parent).title?.absolute || ""),
    alternates: { canonical: `/schedule/${params.category}` },
  };
}

export async function generateStaticParams() {
  return Object.values(viewConfig.categories).map((typeInfo) => ({
    category: typeInfo.alias,
  }));
}

export default async function Page({ params }: Props) {
  return (
    <div className="px-4 lg:px-12 py-16 items-center lg:[align-items:normal] flex flex-col">
      <h1 className="text-text-main lgw-smh:hidden lgw-smh:invisible text-center xl:text-left text-3xl xl:text-4xl font-bold">
        Schedule
      </h1>
      <p className="lgw-smh:hidden lgw-smh:invisible text-center xl:text-left text-text-secondary/75">
        Now find your group.
      </p>
      <Navbar>
        <h1 className="text-text-main text-center lg:text-left text-3xl lg:text-4xl font-bold">
          Schedule
        </h1>
        <p className="text-center xl:text-left text-text-secondary/75">
          Now find your group.
        </p>
      </Navbar>
      <ScheduleList category={params.category} />
    </div>
  );
}
