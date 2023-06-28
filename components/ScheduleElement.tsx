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
    <button
      className="hover:bg-background flex flex-row justify-between items-center sm:text-2xl font-semibold  border-8 border-border p-4 my-2 rounded-3xl min-w-fit"
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        <p className="whitespace-nowrap text-left">{calendar.name}</p>
        {schedule.filters.map((v) =>
          Object.hasOwn(calendar, v.alias) ? (
            <p className="text-md text-inactive text-left" key={v.alias}>
              {calendar[v.alias]}
            </p>
          ) : undefined
        )}
      </div>

      <div
        className={`selected select-none whitespace-nowrap mr-2 rounded-xl w-fit text-right`}
      >
        Import
      </div>
    </button>
  );
}

export default ScheduleElement;
