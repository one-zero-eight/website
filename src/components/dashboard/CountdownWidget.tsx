import { useNowMS } from "@/lib/utils/use-now.ts";

export function CountdownWidget() {
  const nowMs = useNowMS(true, 1000);

  const deadlineMs = new Date(`2026-01-01`).getTime() - 3 * 60 * 60 * 1000;
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
    <div className="group bg-primary flex flex-row gap-4 rounded-2xl px-4 py-4">
      <span className="icon-[twemoji--christmas-tree] text-brand-violet hidden w-12 shrink-0 text-5xl sm:block" />
      <div className="flex flex-col">
        <div className="text-contrast flex text-lg font-semibold">
          <span className="icon-[twemoji--christmas-tree] text-brand-violet mr-2 shrink-0 text-3xl sm:hidden" />
          <span>New Year countdown</span>
        </div>
        <div className="text-contrast/75 line-clamp-1 break-all">
          {daysLeft} days, {hoursLeft} hours, {minutesLeft} minutes,{" "}
          {secondsLeft} seconds
        </div>
      </div>
    </div>
  );
}
