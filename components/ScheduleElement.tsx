import { Calendar, Schedule } from "@/lib/schedule/api";

export type ScheduleElementProps = {
  name: string;
  category: string;
  schedule: Schedule;
  calendar: Calendar;
  onClick: () => void;
};

function ScheduleElement({
  schedule,
  calendar,
  category,
  onClick,
}: ScheduleElementProps) {
  return (
    <button
      className="hover:bg-background flex flex-row justify-between items-center text-lg sm:text-2xl font-semibold  border-8 border-border px-4 py-2 my-2 rounded-3xl min-w-fit"
      onClick={onClick}
    >
      <div>
        <p className="my-2 whitespace-nowrap text-left">{calendar.name}</p>
        {schedule.filters.map((v) =>
          Object.hasOwn(calendar, v.alias) ? (
            <p className="my-2 text-md text-inactive text-left" key={v.alias}>
              {calendar[v.alias]}
            </p>
          ) : undefined
        )}
      </div>

      <div
        className={`selected select-none whitespace-nowrap p-2 rounded-xl w-fit text-right`}
      >
        Import
      </div>
    </button>
  );
}

export default ScheduleElement;
