import { useNowMS } from "@/lib/utils/use-now.ts";

export function CountdownWidget() {
  const nowMs = useNowMS(true, 1000);

  const currentYear = new Date().getFullYear();
  const deadlineMs =
    new Date(`${currentYear}-06-21`).getTime() - 3 * 60 * 60 * 1000;
  const daysLeft = Math.max(
    0,
    Math.floor((deadlineMs - nowMs) / (1000 * 60 * 60 * 24)),
  );
  const hoursLeft =
    Math.max(0, Math.floor((deadlineMs - nowMs) / (1000 * 60 * 60))) % 24;
  const minutesLeft =
    Math.max(0, Math.floor((deadlineMs - nowMs) / (1000 * 60))) % 60;
  const secondsLeft = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000)) % 60;

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-4">
      <span className="icon-[twemoji--sun] hidden w-12 shrink-0 text-5xl text-brand-violet sm:block" />
      <div className="flex flex-col">
        <div className="flex text-lg font-semibold text-contrast">
          <span className="icon-[twemoji--sun] mr-2 shrink-0 text-3xl text-brand-violet sm:hidden" />
          <span>
            Summer solstice countdown:{" "}
            <span className="font-normal">{daysLeft} days</span>
          </span>
        </div>
        <div className="text-contrast/75">
          {hoursLeft} hours, {minutesLeft} minutes, {secondsLeft} seconds
        </div>
      </div>
    </div>
  );
}
