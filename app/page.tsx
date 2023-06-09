import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "InNoHassle ecosystem" },
};

export default function Page() {
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
        You can import the URLs of .ics files to your favorite calendar app and
        receive schedule changes.
      </p>

      <div className="flex gap-x-4 mt-8">
        <Link
          href={`/schedule`}
          className="flex flex-col justify-between items-center border-8 border-border px-4 py-2 my-2 rounded-3xl"
        >
          <p className="text-lg sm:text-2xl font-semibold">
            Find your schedule
          </p>
        </Link>
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
