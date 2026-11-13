import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { cn } from "@/lib/ui/cn";
import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";

/**
 * Handles profile loading and error states shared by every sport page,
 * then renders children inside the page's width-constrained container.
 */
export function SportPageShell({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  const sport = useSportProfile();
  const layoutClassName = centered
    ? "mx-auto w-full max-w-[1200px] px-4 py-6"
    : "px-4 py-4";

  if (sport.profilePending) {
    return (
      <div className={cn("flex flex-col gap-4", layoutClassName)}>
        <div className="bg-base-200 rounded-box h-40 animate-pulse" />
        <div className="bg-base-200 rounded-box h-64 animate-pulse" />
      </div>
    );
  }

  if (sport.profileError || !sport.profile) {
    return (
      <div className={layoutClassName}>
        <div className="card card-border border-error bg-base-100">
          <div className="card-body">
            <h2 className="card-title text-error">
              <Trans>Sport profile unavailable</Trans>
            </h2>
            <p className="text-base-content/80 text-sm">
              {sport.profileErr != null &&
              typeof sport.profileErr === "object" &&
              "message" in sport.profileErr &&
              typeof (sport.profileErr as { message?: unknown }).message ===
                "string" ? (
                (sport.profileErr as { message: string }).message
              ) : (
                <Trans>
                  You may not be registered in the sport system yet.
                </Trans>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col gap-6", layoutClassName)}>
      {children}
    </div>
  );
}
