import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";

const steps = ["Sign in", "Telegram", "Dorm", "Groups", "Complete"] as const;

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <>
      <div className="min-[480px]:hidden">
        <ol className="flex w-full items-center">
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const isComplete = stepNumber < step;
            const marker = (
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                  stepNumber <= step
                    ? "bg-primary text-primary-content"
                    : "bg-base-300 text-base-content/40",
                )}
              >
                {isComplete ? (
                  <span className="icon-[material-symbols--check-rounded] text-lg" />
                ) : (
                  stepNumber
                )}
              </span>
            );

            return (
              <li
                key={label}
                className="flex min-w-0 flex-1 items-center last:flex-none"
              >
                {isComplete ? (
                  <Link
                    to="/start"
                    search={{ step: stepNumber as 1 | 2 | 3 | 4 | 5 }}
                    className="rounded-full"
                  >
                    {marker}
                  </Link>
                ) : (
                  marker
                )}
                {index < steps.length - 1 && (
                  <span
                    className={cn(
                      "mx-1 h-1 min-w-2 flex-1 rounded-full",
                      stepNumber < step ? "bg-primary" : "bg-base-300",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <ol className="hidden w-full max-w-2xl grid-cols-5 gap-2 min-[480px]:grid">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < step;
          const isCurrent = stepNumber === step;
          const content = (
            <>
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  stepNumber <= step ? "bg-primary" : "bg-base-300",
                )}
              />
              <p
                className={cn(
                  "mt-2 truncate text-center text-xs",
                  isCurrent
                    ? "text-base-content font-medium"
                    : isComplete
                      ? "text-base-content/70"
                      : "text-base-content/40",
                )}
              >
                {label}
              </p>
            </>
          );

          return (
            <li key={label} className="min-w-0">
              {isComplete ? (
                <Link
                  to="/start"
                  search={{ step: stepNumber as 1 | 2 | 3 | 4 | 5 }}
                  className="hover:bg-base-200 block rounded-md p-1"
                >
                  {content}
                </Link>
              ) : (
                <div className="p-1">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
