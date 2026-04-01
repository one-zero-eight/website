import { $sport } from "@/api/sport";
import { useNowMS } from "@/lib/utils/use-now.ts";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function SportsWidget() {
  const [widgetShown, setWidgetShown] = useLocalStorage("widget-sports", false);
  const { data: profile, isPending: profileIsPending } = $sport.useQuery(
    "get",
    "/users/me",
  );
  const hasSportProfile = !!profile;
  const { data: hours } = $sport.useQuery(
    "get",
    "/students/{student_id}/hours-summary",
    { params: { path: { student_id: Number(profile?.user_id) } } },
    { enabled: !!profile },
  );
  const { data: currentSemester } = $sport.useQuery(
    "get",
    "/semesters/current",
    {},
    { enabled: !!profile },
  );

  const nowMs = useNowMS(hasSportProfile);

  useEffect(() => {
    setWidgetShown((v) => (v && profileIsPending) || hasSportProfile);
  }, [setWidgetShown, profileIsPending, hasSportProfile]);

  if (!hasSportProfile || !hours || !currentSemester) {
    if (!widgetShown) return null;
    return (
      <div className="group bg-base-200 rounded-box flex min-h-32 animate-pulse flex-row gap-4 px-4 py-6" />
    );
  }

  const earnedHours = hours.hours_from_groups + hours.self_sport_hours;
  const semesterHours = hours.required_hours;
  const debtHours = hours.debt;

  const deadline = new Date(currentSemester?.end || "2025-05-04");
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="group bg-base-200 rounded-box flex flex-row gap-4 px-4 py-4">
      <span className="icon-[material-symbols--exercise-outline] text-primary hidden w-12 shrink-0 text-5xl sm:block" />
      <div className="flex flex-col">
        <p className="text-base-content flex items-center text-lg font-semibold">
          <span className="icon-[material-symbols--exercise-outline] text-primary mr-2 shrink-0 text-3xl sm:hidden" />
          <span>
            Sports:{" "}
            <span className="font-normal">
              {earnedHours} / {semesterHours}
              {debtHours ? `+${debtHours} (debt)` : null} hours
            </span>
          </span>
        </p>
        <p className="text-base-content/75">
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
          className="text-base-content/75 w-fit hover:underline"
        >
          Check in for sports in the{" "}
          <span className="text-primary">Sports bot</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}
