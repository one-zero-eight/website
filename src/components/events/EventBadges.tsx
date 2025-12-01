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
  student_activity: (
    <div
      className={`badge badge-soft [--badge-color:var(--color-neutral-500)]`}
    >
      Student Activity
    </div>
  ),
};
