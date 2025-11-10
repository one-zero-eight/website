import { SchemaBadge } from "@/api/workshops/types";
import { eventBadges } from "../EventBadges";

export const MAX_BADGES_AMOUT = 3;

export interface GenericBadgeFormScheme {
  badges: SchemaBadge[];
}

export interface TagsSelectorProps<T extends GenericBadgeFormScheme> {
  form: T;
  maxBadgesAmount?: number;
  setForm: (v: T) => void;
}

/**
 * Tag Selector component for admin creation form
 */
export default function TagsSelector<T extends GenericBadgeFormScheme>({
  form,
  setForm,
  maxBadgesAmount,
}: TagsSelectorProps<T>) {
  const addTag = (tag: string) => {
    if (form.badges.length === (maxBadgesAmount || MAX_BADGES_AMOUT)) return;

    const newBadges: SchemaBadge[] = [
      ...(form.badges as SchemaBadge[]),
      { title: tag, color: "#FFFFFF" }, // Color doesnt matter, all badges are linked with their names
    ];

    setForm({
      ...form,
      badges: newBadges,
    });
  };

  const removeTag = (tag: string) => {
    const newBadges: SchemaBadge[] = [
      ...(form.badges as SchemaBadge[]).filter((t) => t.title !== tag),
    ];

    setForm({
      ...form,
      badges: newBadges,
    });
  };

  const hasBadgeWithTitle = (value: string): boolean => {
    return form.badges.some((badge: SchemaBadge) => badge.title === value);
  };

  return (
    <fieldset className="fieldset flex flex-col gap-2">
      <legend className="fieldset-legend text-xs">
        Tags ({form.badges.length}/{maxBadgesAmount || MAX_BADGES_AMOUT}):
      </legend>
      <div className="input h-auto w-full cursor-default flex-wrap py-3 select-none">
        {form.badges.length !== 0 ? (
          Object.entries(eventBadges)
            .filter(([value]) => hasBadgeWithTitle(value))
            .sort((a, _) => (a[0] === "recommended" ? -1 : 1))
            .map(([value, badge], index) => (
              <span
                className="cursor-pointer"
                key={index}
                onClick={() => removeTag(value)}
              >
                {badge}
              </span>
            ))
        ) : (
          <span className="text-neutral-600">No Tags</span>
        )}
      </div>
      <div className="input flex h-auto w-full cursor-default flex-wrap py-3 select-none">
        {Object.entries(eventBadges)
          .filter(([value]) => !hasBadgeWithTitle(value))
          .sort((a, _) => (a[0] === "recommended" ? -1 : 1))
          .map(([value, badge], index) => (
            <span
              key={index}
              onClick={() => addTag(value)}
              className="cursor-pointer"
            >
              {badge}
            </span>
          ))}
      </div>
    </fieldset>
  );
}
