import { $sports } from "@/api/sports";
import { useNowMS } from "@/lib/utils/use-now.ts";

export function SportsWidget() {
  const { data: sportInfo } = $sports.useQuery("get", "/users/sport_info");
  const nowMs = useNowMS(!!sportInfo);

  if (!sportInfo) return null;

  const earnedHours =
    sportInfo.ongoing_semester.hours_not_self +
    sportInfo.ongoing_semester.hours_self_not_debt +
    sportInfo.ongoing_semester.hours_self_debt;
  const semesterHours = sportInfo.ongoing_semester.hours_sem_max;
  const debtHours = sportInfo.ongoing_semester.debt;

  // TODO: Fetch the end date of current semester from sports
  const deadline = new Date("2024-12-08");
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-6">
      <div className="w-12">
        <span className="icon-[material-symbols--exercise-outline] text-5xl text-brand-violet" />
      </div>
      <div className="flex flex-col">
        <p className="text-2xl font-semibold text-text-main">
          Sports:{" "}
          <span className="font-normal">
            {earnedHours} / {semesterHours}
            {debtHours ? ` (+${debtHours} debt)` : null} hours
          </span>
        </p>
        <p className="mt-2 text-lg text-text-secondary/75">
          <span className="font-semibold">Deadline:</span>{" "}
          {deadline.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          ({daysLeft} days left)
        </p>
        <a
          href="https://t.me/sportinIU/566"
          className="w-fit text-lg text-text-secondary/75 hover:underline"
        >
          Register for <span className="text-brand-violet">Fitness test</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
        <a
          href="https://t.me/IUSportBot"
          className="w-fit text-lg text-text-secondary/75 hover:underline"
        >
          Check in for sports in the{" "}
          <span className="text-brand-violet">Sports bot</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}
