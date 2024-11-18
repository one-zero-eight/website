import { $sports } from "@/api/sports";

export function SportsWidget() {
  const { data: sportInfo } = $sports.useQuery("get", "/users/sport_info");

  if (!sportInfo) return null;

  const earnedHours =
    sportInfo.ongoing_semester.hours_not_self +
    sportInfo.ongoing_semester.hours_self_not_debt +
    sportInfo.ongoing_semester.hours_self_debt;
  const semesterHours = sportInfo.ongoing_semester.hours_sem_max;
  const debtHours = sportInfo.ongoing_semester.debt;

  /* TODO: Fetch the end date of current semester from sports
  const deadline = new Date(sportInfo.ongoing_semester.deadline);
  const daysLeft = Math.max(
    0,
    Math.floor((deadline.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
  );*/

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6">
      <div className="w-12">
        <span className="icon-[material-symbols--exercise-outline] text-5xl text-brand-violet" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-semibold text-text-main">
          Sports: {earnedHours} / {semesterHours}
          {debtHours ? ` (+${debtHours} debt)` : null} hours
        </p>
        {/*<p className="text-lg text-text-secondary/75">
          Deadline:{" "}
          {deadline.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          ({daysLeft} days left)
        </p>*/}
        <a
          href="https://t.me/IUSportBot"
          className="text-lg text-text-secondary/75 hover:underline"
        >
          Check in for sports in the{" "}
          <span className="text-brand-violet">Sports bot</span>.
        </a>
      </div>
    </div>
  );
}
