import ClarificationCard from "@/components/ClarificationCard";
import TableChartIcon from "@/components/icons/TableChartIcon";
import DoubleArrowIcon from "@/components/icons/DoubleArrowIcon";
import DataIcon from "@/components/icons/DataIcon";
import Arrow from "@/components/Arrow";
import SettingsMagicIcon from "@/components/icons/SettingsMagicIcon";
import CalendarAddIcon from "@/components/icons/CalendarAddIcon";
import MagicExchangeIcon from "@/components/icons/MagicExchangeIcon";

export default function ClarificationContainer() {
  return (
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
  )
}