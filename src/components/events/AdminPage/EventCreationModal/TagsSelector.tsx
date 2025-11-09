import { SchemaBadge } from "@/api/workshops/types";
import { eventBadges } from "../../EventBadges";
import { EventFormState } from "./CreationForm";

export const MAX_BADGES_AMOUT = 4;

export interface TagsSelectorProps {
  eventForm: EventFormState;
  setEventForm: (v: EventFormState) => void;
}

/**
 * Tag Selector component for admin creation form
 */
export default function TagsSelector({
  eventForm,
  setEventForm,
}: TagsSelectorProps) {
  const addTag = (tag: string) => {
    if (eventForm.badges.length === MAX_BADGES_AMOUT) return;

    const newBadges: SchemaBadge[] = [
      ...(eventForm.badges as SchemaBadge[]),
      { title: tag, color: "#FFFFFF" }, // Color doesnt matter, all badges are linked with their names
    ];

    setEventForm({
      ...eventForm,
      badges: newBadges,
    });
  };

  const removeTag = (tag: string) => {
    const newBadges: SchemaBadge[] = [
      ...(eventForm.badges as SchemaBadge[]).filter((t) => t.title !== tag),
    ];

    setEventForm({
      ...eventForm,
      badges: newBadges,
    });
  };

  const hasBadgeWithTitle = (value: string): boolean => {
    return eventForm.badges.some((badge) => badge.title === value);
  };

  return (
    <fieldset className="fieldset flex flex-col gap-2">
      <legend className="fieldset-legend text-xs">
        Tags ({eventForm.badges.length}/{MAX_BADGES_AMOUT}):
      </legend>
      <div className="input w-full cursor-default select-none">
        {eventForm.badges.length !== 0 ? (
          Object.entries(eventBadges)
            .filter(([value]) => hasBadgeWithTitle(value))
            .map(([value, badge]) => (
              <span className="cursor-pointer" onClick={() => removeTag(value)}>
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
