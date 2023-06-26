import { Metadata } from "next";
import CategoryContainer from "@/components/CategoryContainer";
import ClarificationCard from "@/components/ClarificationCard";
import TableChartIcon from "@/components/icons/TableChartIcon";
import DoubleArrowIcon from "@/components/icons/DoubleArrowIcon";
import DataIcon from "@/components/icons/DataIcon";
import Arrow from "@/components/Arrow";
import SettingsMagicIcon from "@/components/icons/SettingsMagicIcon";
import CalendarAddIcon from "@/components/icons/CalendarAddIcon";
import MagicExchangeIcon from "@/components/icons/MagicExchangeIcon";

export const metadata: Metadata = {
  title: { absolute: "InNoHassle ecosystem" },
};

export default async function Page() {
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
      <h2 className="text-3xl sm:text-3xl md:text-4xl font-medium mt-8 text-center">Choose the category</h2>
      <CategoryContainer/>
      <h3 className="text-3xl font-medium mt-8">How it works?</h3>
      <div className="flex flex-row flex-wrap items-center justify-center sm:flex-nowrap w-full gap-x-10 mt-8">
      <ClarificationCard
        icon={[TableChartIcon, DoubleArrowIcon, DataIcon]}
        title="Retrieval"
        shortDescription={`Parsers extract academic schedules from spreadsheets.`}
      />
      <Arrow/>
        <ClarificationCard
          icon={[SettingsMagicIcon]}
          title="Processing"
          shortDescription={`The scripts generate .ics files for calendar apps`}
        />
        <Arrow/>
        <ClarificationCard
          icon={[CalendarAddIcon]}
          title="Import"
          shortDescription={`You can import the schedule into your favorite calendar app!`}
        />
        <Arrow/>
        <ClarificationCard
          icon={[MagicExchangeIcon]}
          title="Synchronize"
          shortDescription={`Your calendar will update with schedule changes!`}
        />
      </div>
      <hr className="border-white/25 my-8 md:w-1/2 w-full" />
      <p className="text-white/75">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight" className="text-white">
          github/one-zero-eight
        </a>
      </p>
    </main>
  );
}
