import { SchemaBadge } from "@/api/workshops/types";
import { eventBadges } from "../../EventBadges";
import { EventFormState } from "./CreationForm";

interface TagsSelectorProps {
  event: EventFormState;
  setEventForm: (v: EventFormState) => void;
}

export default function TagsSelector({
  event,
  setEventForm,
}: TagsSelectorProps) {
  const addTag = (tag: string) => {
    if (event.badges.length === 3) return;

    const newBadges: SchemaBadge[] = [
      ...(event.badges as SchemaBadge[]),
      { title: tag, color: "#FFFFFF" },
    ];

    setEventForm({
      ...event,
      badges: newBadges,
    });
  };

  const removeTag = (tag: string) => {
    const newBadges: SchemaBadge[] = [
      ...(event.badges as SchemaBadge[]).filter((t) => t.title !== tag),
    ];

    setEventForm({
      ...event,
      badges: newBadges,
    });
  };

  const hasBadgeWithTitle = (value: string): boolean => {
    return event.badges.some((badge) => badge.title === value);
  };

  return (
    <fieldset className="fieldset flex flex-col gap-2">
      <legend className="fieldset-legend text-xs">
        Tags ({event.badges.length}/3):
      </legend>
      <div className="input w-full cursor-default">
        {event.badges.length !== 0 ? (
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
