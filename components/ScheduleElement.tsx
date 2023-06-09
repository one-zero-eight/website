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
    <div className="flex flex-row justify-between items-center text-lg sm:text-2xl font-semibold  border-8 border-border px-4 py-2 my-2 rounded-3xl min-w-fit">
      <div>
        <p className="my-2 whitespace-nowrap">{calendar.name}</p>
        {schedule.filters.map((v) =>
          Object.hasOwn(calendar, v.alias) ? (
            <p className="my-2 text-md text-inactive" key={v.alias}>
              {calendar[v.alias]}
            </p>
          ) : undefined
        )}
      </div>

      <button
        className={`hover:cursor-pointer selected select-none whitespace-nowrap p-2 rounded-xl w-fit`}
        onClick={onClick}
      >
        Import
      </button>
    </div>
  );
}

export default ScheduleElement;
