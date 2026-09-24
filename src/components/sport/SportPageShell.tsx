import { useSportProfile } from "@/components/sport/sport-profile.ts";
import type { ReactNode } from "react";

/**
 * Handles profile loading and error states shared by every sport page,
 * then renders children inside the page's width-constrained container.
 */
export function SportPageShell({ children }: { children: ReactNode }) {
  const sport = useSportProfile();

  if (sport.profilePending) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="bg-base-200 rounded-box h-40 animate-pulse" />
        <div className="bg-base-200 rounded-box h-64 animate-pulse" />
      </div>
    );
  }

  if (sport.profileError || !sport.profile) {
    return (
      <div className="px-4 py-4">
        <div className="card card-border border-error bg-base-100">
          <div className="card-body">
            <h2 className="card-title text-error">Sport profile unavailable</h2>
            <p className="text-base-content/80 text-sm">
              {sport.profileErr != null &&
              typeof sport.profileErr === "object" &&
              "message" in sport.profileErr &&
              typeof (sport.profileErr as { message?: unknown }).message ===
                "string"
                ? (sport.profileErr as { message: string }).message
                : "You may not be registered in the sport system yet."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <div className="flex w-full flex-col gap-6 px-4 py-4">{children}</div>;
}
