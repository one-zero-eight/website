import { $sport } from "@/api/sport";
import { useNowMS } from "@/lib/utils/use-now.ts";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function SportsWidget() {
  const [widgetShown, setWidgetShown] = useLocalStorage("widget-sports", false);
  const { data: profile, isPending: profileIsPending } = $sport.useQuery(
    "get",
    "/profile/student",
  );
  const hasSportProfile = !!profile;
  const { data: hours } = $sport.useQuery(
    "get",
    "/attendance/{student_id}/hours",
    { params: { path: { student_id: Number(profile?.id) } } },
    { enabled: !!profile },
  );
  const { data: semesters } = $sport.useQuery(
    "get",
    "/semester",
    {},
    { enabled: !!profile },
  );

  const nowMs = useNowMS(hasSportProfile);

  useEffect(() => {
    setWidgetShown((v) => (v && profileIsPending) || hasSportProfile);
  }, [setWidgetShown, profileIsPending, hasSportProfile]);

  if (!hasSportProfile || !hours || !semesters) {
    if (!widgetShown) return null;
    return (
      <div className="group flex min-h-32 animate-pulse flex-row gap-4 rounded-2xl bg-primary px-4 py-6" />
    );
  }

  const earnedHours =
    hours.ongoing_semester.hours_not_self +
    hours.ongoing_semester.hours_self_not_debt +
    hours.ongoing_semester.hours_self_debt;
  const semesterHours = hours.ongoing_semester.hours_sem_max;
  const debtHours = hours.ongoing_semester.debt;

  const currentSemester = semesters.find(
    (s) => s.id === hours.ongoing_semester.id_sem,
  );

  const deadline = new Date(currentSemester?.end || "2025-05-04");
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-4">
      <span className="icon-[material-symbols--exercise-outline] hidden w-12 shrink-0 text-5xl text-brand-violet sm:block" />
      <div className="flex flex-col">
        <p className="flex items-center text-lg font-semibold text-contrast">
          <span className="icon-[material-symbols--exercise-outline] mr-2 shrink-0 text-3xl text-brand-violet sm:hidden" />
          <span>
            Sports:{" "}
            <span className="font-normal">
              {earnedHours} / {semesterHours}
              {debtHours ? `+${debtHours} (debt)` : null} hours
            </span>
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
