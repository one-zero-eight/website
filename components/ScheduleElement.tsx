import { GroupCard } from "@/components/GroupCard";
import { Calendar, Schedule } from "@/lib/schedule/api";

export type ScheduleElementProps = {
  schedule: Schedule;
  calendar: Calendar;
  onClick: () => void;
};

function ScheduleElement({
  schedule,
  calendar,
  onClick,
}: ScheduleElementProps) {
  return (
    <GroupCard
      name={calendar.name}
      favorite={false}
      onFavoriteClick={() => {}}
      onImportClick={onClick}
    >
      {schedule.filters.map((v) =>
        Object.hasOwn(calendar, v.alias) ? (
          <p
            className="text-xl text-inactive text-left font-medium"
            key={v.alias}
          >
            {calendar[v.alias]}
          </p>
        ) : undefined
      )}
    </GroupCard>
  );
}

export default ScheduleElement;
