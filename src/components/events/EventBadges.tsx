import { ReactElement } from "react";

/**
 * Object containing all adges, that can be assigned to an event.
 * Badges: recommended, iu, music, sports, art, it, education, 319, society, buisness, games
 */
export const eventBadges: Record<string, ReactElement> = {
  recommended: (
    <div className="badge dark:badge-soft badge-warning gap-1">
      <span className="icon-[lets-icons--star-fill] size-4"></span>
      Recommended
    </div>
  ),
  iu: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      IU
    </div>
  ),
  music: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Music
    </div>
  ),
  sports: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Sports
    </div>
  ),
  art: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Art
    </div>
  ),
  it: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      IT
    </div>
  ),
  education: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Education
    </div>
  ),
  319: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      319
    </div>
  ),
  society: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Society
    </div>
  ),
  buisness: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Buisness
    </div>
  ),
  games: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Games
    </div>
  ),
};
