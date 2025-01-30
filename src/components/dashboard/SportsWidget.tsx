import { $sports } from "@/api/sports";
import { useNowMS } from "@/lib/utils/use-now.ts";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function SportsWidget() {
  const [widgetShown, setWidgetShown] = useLocalStorage("widget-sports", false);
  const { data: sportInfo, isPending } = $sports.useQuery(
    "get",
    "/users/sport_info",
  );
  const nowMs = useNowMS(!!sportInfo);

  useEffect(() => {
    setWidgetShown((v) => (v && isPending) || !!sportInfo);
  }, [setWidgetShown, isPending, sportInfo]);

  if (!sportInfo) {
    if (!widgetShown) return null;
    return (
      <div className="group flex min-h-32 animate-pulse flex-row gap-4 rounded-2xl bg-primary px-4 py-6" />
    );
  }

  const earnedHours =
    sportInfo.ongoing_semester.hours_not_self +
    sportInfo.ongoing_semester.hours_self_not_debt +
    sportInfo.ongoing_semester.hours_self_debt;
  const semesterHours = sportInfo.ongoing_semester.hours_sem_max;
  const debtHours = sportInfo.ongoing_semester.debt;

  // TODO: Fetch the end date of current semester from sports
  const deadline = new Date("2025-05-04");
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-4">
      <div className="w-12">
        <span className="icon-[material-symbols--exercise-outline] text-5xl text-brand-violet" />
      </div>
      <div className="flex flex-col">
        <p className="text-lg font-semibold text-contrast">
          Sports:{" "}
          <span className="font-normal">
            {earnedHours} / {semesterHours}
            {debtHours ? `+${debtHours} (debt)` : null} hours
          </span>
        </p>
        <p className="text-contrast/75">
          <span className="font-semibold">Deadline:</span>{" "}
          {deadline.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          ({daysLeft} days left)
        </p>
        <a
          href="https://t.me/IUSportBot"
          className="w-fit text-contrast/75 hover:underline"
        >
          Check in for sports in the{" "}
          <span className="text-brand-violet">Sports bot</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}
