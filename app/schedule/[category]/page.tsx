import { Navbar } from "@/components/Navbar";
import ScheduleList from "@/components/ScheduleList";
import { getTypeInfoBySlug, viewConfig } from "@/lib/events-view-config";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

export type Props = {
  params: { category: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const typeInfo = getTypeInfoBySlug(params.category);

  if (typeInfo === undefined) {
    notFound();
  }

  return {
    title: typeInfo.title + " " + ((await parent).title?.absolute || ""),
    alternates: { canonical: `/schedule/${params.category}` },
  };
}

export async function generateStaticParams() {
  return Object.values(viewConfig.types).map((typeInfo) => ({
    category: typeInfo.slug,
  }));
}

export default async function Page({ params }: Props) {
  return (
    <div className="p-2 pt-16 items-center lg:[align-items:normal] flex flex-col">
      <h1 className="text-text-main lg:hidden lg:invisible text-center xl:text-left text-3xl xl:text-4xl font-bold">
        Schedule
      </h1>
      <p className="lg:hidden lg:invisible text-center xl:text-left text-text-secondary/75">
        Now find your group.
      </p>
      <Navbar className="hidden invisible lg:flex lg:visible">
        <h1 className="text-text-main text-center xl:text-left text-3xl xl:text-4xl font-bold">
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
