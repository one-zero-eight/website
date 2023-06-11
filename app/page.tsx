import { getCategories } from "@/lib/schedule/api";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: "InNoHassle ecosystem" },
};

export default async function Page() {
  const categories = await getCategories();
  if (categories === undefined) {
    notFound();
  }

  return (
    <main className="p-4 sm:p-16">
      <h1 className="text-4xl font-bold">InNoHassle ecosystem</h1>
      <p className="text-white/75">
        Services developed by{" "}
        <a href="https://t.me/one_zero_eight" className="text-white">
          one-zero-eight community
        </a>{" "}
        for Innopolis students.
      </p>
      <h2 className="text-3xl font-bold mt-8">Schedule</h2>
      <p className="text-white/75">
        We&apos;ve created parsers for these inconvenient spreadsheets with
        schedule of classes.
        <br />
        The scripts generate .ics files for calendar apps.
        <br />
        You can import the URLs of .ics files into your favorite calendar app
        and receive schedule changes.
      </p>
      <h3 className="text-2xl font-bold mt-8">Find your schedule</h3>
      <p className="text-white/75">Firstly, choose a category.</p>
      <div className="flex flex-row flex-wrap sm:flex-nowrap gap-x-4 mt-8">
        {categories.categories.map((v) => (
          <Link
            key={v.slug}
            href={`/schedule/${v.slug}`}
            className="hover:bg-background flex flex-col justify-between items-center border-8 border-border px-4 py-2 my-2 rounded-3xl text-center w-full sm:w-fit"
          >
            <p className="sm:text-2xl font-semibold selected">{v.title}</p>
            {v.shortDescription}
          </Link>
        ))}
      </div>
      <hr className="border-white/25 my-8 md:w-1/2 w-full" />
      <p className="text-white/75">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight" className="text-white">
          @one-zero-eight
        </a>
      </p>
    </main>
  );
}
