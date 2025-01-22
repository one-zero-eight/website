import { useNowMS } from "@/lib/utils/use-now.ts";

export function CountdownWidget() {
  const nowMs = useNowMS(true, 1000);

  const currentYear = new Date().getFullYear();
  const deadlineMs =
    new Date(`${currentYear}-06-01`).getTime() - 3 * 60 * 60 * 1000;
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
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-6">
      <div className="w-12">
        <span className="icon-[twemoji--sun] text-5xl text-brand-violet" />
      </div>
      <div className="flex flex-col">
        <div className="text-2xl font-semibold text-contrast">
          Summer Countdown: <span className="font-normal">{daysLeft} days</span>
          <p className="mt-2 text-lg text-contrast/75">
            {hoursLeft} hours, {minutesLeft} minutes, {secondsLeft} seconds
          </p>
        </div>
      </div>
    </div>
  );
}
