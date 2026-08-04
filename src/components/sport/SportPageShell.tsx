import type { SportProfileReady } from "@/components/sport/sport-profile.ts";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import type { ReactNode } from "react";

/**
 * Handles the token/profile loading and error states shared by every sport
 * page, then renders `children` inside the page's width-constrained
 * container once the profile is ready.
 */
export function SportPageShell({
  children,
}: {
  children: (sport: SportProfileReady) => ReactNode;
}) {
  const sport = useSportProfile();

  if (!sport.sportToken) {
    return (
      <div className="px-4 py-8">
        <div className="bg-base-200 rounded-box mx-auto max-w-md p-6 text-center">
          <div className="border-primary mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-base-content/80">
            Connecting to the sport service…
          </p>
        </div>
      </div>
    );
  }

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
            <p className="text-base-content/70 text-sm">
              Try the{" "}
              <a
                href="https://t.me/IUSportBot"
                className="text-primary link"
                target="_blank"
                rel="noreferrer"
              >
                Telegram bot
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-4">
      {children({ ...sport, profile: sport.profile })}

      <p className="text-base-content/60 text-center text-sm">
        Other questions? Contact your sport course curator or the sport office.
      </p>
    </div>
  );
}
