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
    <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-7 grow-0 place-items-center w-full gap-y-10 mt-8">
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
      <Arrow className="lg:hidden lg:invisible 2xl:flex 2xl:visible" />
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
