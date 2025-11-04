import { ReactElement } from "react";

/**
 * Object containing all adges, that can be assigned to an event.
 * Badges: recommended, iu, music, sports, art, it, education, creativity, society, buisness, games
 */
export const eventBadges: Record<string, ReactElement> = {
  recommended: (
    <div className="badge badge-soft badge-warning gap-1">
      <span className="icon-[lets-icons--star-fill] size-4"></span>
      Recommended
    </div>
  ),
  iu: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-emerald-500)]`}
    >
      IU
    </div>
  ),
  music: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-fuchsia-500)]`}
    >
      Music
    </div>
  ),
  sports: (
    <div className={`badge badge-soft [--badge-color:var(--color-blue-500)]`}>
      Sports
    </div>
  ),
  art: (
    <div className={`badge badge-soft [--badge-color:var(--color-rose-500)]`}>
      Art
    </div>
  ),
  it: (
    <div className={`badge badge-soft [--badge-color:var(--color-indigo-500)]`}>
      IT
    </div>
  ),
  education: (
    <div className={`badge badge-soft [--badge-color:var(--color-yellow-500)]`}>
      Education
    </div>
  ),
  creativity: (
    <div className={`badge badge-soft [--badge-color:var(--color-violet-500)]`}>
      Creativity
    </div>
  ),
  society: (
    <div className={`badge badge-soft [--badge-color:var(--color-teal-500)]`}>
      Society
    </div>
  ),
  buisness: (
    <div className={`badge badge-soft [--badge-color:var(--color-slate-400)]`}>
      Buisness
    </div>
  ),
  games: (
    <div className={`badge badge-soft [--badge-color:var(--color-cyan-500)]`}>
      Games
    </div>
  ),
};
