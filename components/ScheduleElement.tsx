import { Calendar, Schedule } from "@/lib/schedule/api";
import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";

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
      className="bg-background hover:bg-hover_color flex flex-row justify-between items-center sm:text-2xl px-7 py-5 my-2 rounded-3xl w-96"
      onClick={onClick}
    >
      <div className="flex flex-col gap-0.5">
        <p className="whitespace-nowrap text-left text-2xl font-medium">
          {calendar.name}
        </p>
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
      </div>
      <div
        className={`flex flex-row selected select-none whitespace-nowrap rounded-xl w-fit text-right`}
      >
        <FavoriteIcon isActive={false} />
        <DownloadIcon fill={`rgba(256, 256, 256, 0.75)`} />
        {/*Import*/}
      </div>
    </button>
  );
}

export default ScheduleElement;
