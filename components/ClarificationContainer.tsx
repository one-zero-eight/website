import Arrow from "@/components/Arrow";
import ClarificationCard from "@/components/ClarificationCard";
import CalendarAddIcon from "@/components/icons/CalendarAddIcon";
import DataIcon from "@/components/icons/DataIcon";
import DoubleArrowIcon from "@/components/icons/DoubleArrowIcon";
import MagicExchangeIcon from "@/components/icons/MagicExchangeIcon";
import SettingsMagicIcon from "@/components/icons/SettingsMagicIcon";
import TableChartIcon from "@/components/icons/TableChartIcon";

export default function ClarificationContainer() {
  return (
    <div className="mt-8 grid w-full grow-0 grid-cols-1 place-items-center gap-y-10 lg:grid-cols-3 2xl:grid-cols-7">
      <ClarificationCard
        icon={[TableChartIcon, DoubleArrowIcon, DataIcon]}
        title="Retrieval"
        shortDescription={`Parsers extract academic schedules from spreadsheets.`}
      />
      <Arrow />
      <ClarificationCard
        icon={[SettingsMagicIcon]}
        title="Processing"
        shortDescription={`The scripts generate .ics files for calendar apps`}
      />
      <Arrow className="lg:invisible lg:hidden 2xl:visible 2xl:flex" />
      <ClarificationCard
        icon={[CalendarAddIcon]}
        title="Import"
        shortDescription={`You can import the schedule into your favorite calendar app!`}
      />
      <Arrow />
      <ClarificationCard
        icon={[MagicExchangeIcon]}
        title="Synchronize"
        shortDescription={`Your calendar will update with schedule changes!`}
      />
    </div>
  );
}
