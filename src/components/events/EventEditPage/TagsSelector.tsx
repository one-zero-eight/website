import { SchemaBadge } from "@/api/workshops/types";
import { eventBadges } from "../EventBadges";
import { MAX_BADGES_AMOUNT } from "../constants";

export const MAX_BADGES_AMOUT = MAX_BADGES_AMOUNT;

export interface GenericBadgeFormScheme {
  badges: SchemaBadge[];
}

export interface TagsSelectorProps<T extends GenericBadgeFormScheme> {
  form: T;
  maxBadgesAmount?: number;
  tagsToExlude?: string[];
  lockBadges?: string[];
  setForm: (v: T) => void;
}

/**
 * Tag Selector component for admin creation form
 */
export default function TagsSelector<T extends GenericBadgeFormScheme>({
  form,
  setForm,
  tagsToExlude = [],
  lockBadges = [],
  maxBadgesAmount,
}: TagsSelectorProps<T>) {
  const badges = form.badges;

  const addTag = (tag: string) => {
    if (badges.length === (maxBadgesAmount || MAX_BADGES_AMOUT)) return;

    const newBadges: SchemaBadge[] = [
      ...(badges as SchemaBadge[]),
      { title: tag, color: "#FFFFFF" }, // Color doesnt matter, all badges are linked with their names
    ];

    setForm({
      ...form,
      badges: newBadges,
    });
  };

  const removeTag = (tag: string) => {
    if (lockBadges.includes(tag)) {
      return;
    }

    const newBadges: SchemaBadge[] = [
      ...(badges as SchemaBadge[]).filter((t) => t.title !== tag),
    ];

    setForm({
      ...form,
      badges: newBadges,
    });
  };

  const hasBadgeWithTitle = (value: string): boolean => {
    return badges.some((badge: SchemaBadge) => badge.title === value);
  };

  const showSuggestions = !maxBadgesAmount
    ? Object.keys(eventBadges).filter((b) => !badges.some((a) => a.title === b))
        .length !== 0
    : badges.length !== maxBadgesAmount;

  return (
    <fieldset className="fieldset flex flex-col gap-2">
      <legend className="fieldset-legend text-xs">
        Tags ({badges.length}/{maxBadgesAmount || MAX_BADGES_AMOUT}):
      </legend>
      <div className="input h-auto w-full cursor-default flex-wrap p-2 select-none">
        {badges.length !== 0 ? (
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
      {showSuggestions &&
        (() => {
          const suggestions = Object.entries(eventBadges)
            .filter(([value]) => !hasBadgeWithTitle(value))
            .filter(([value]) => !tagsToExlude.includes(value))
            .sort((a, _) => (a[0] === "recommended" ? -1 : 1));
          if (suggestions.length === 0) return null;
          return (
            <div className="input flex h-auto w-full cursor-default flex-wrap p-2 select-none">
              {suggestions.map(([value, badge], index) => (
                <span
                  key={index}
                  onClick={() => addTag(value)}
                  className="cursor-pointer"
                >
                  {badge}
                </span>
              ))}
            </div>
          );
        })()}
    </fieldset>
  );
}
