import Tooltip from "@/components/common/Tooltip";
import { useEventGroup } from "@/api/events/event-group.ts";

export default function HideButton({ groupId }: { groupId: number }) {
  const { isHidden, switchHideFavorite } = useEventGroup(groupId);
  return (
    <Tooltip content={isHidden ? "Hidden from calendar" : "Hide from calendar"}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          switchHideFavorite?.();
        }}
        className="hover:bg-inh-secondary-hover rounded-box flex h-12 w-12 items-center justify-center text-4xl"
      >
        {isHidden ? (
          <span className="icon-[material-symbols--visibility-off-outline] text-base-content/50" />
        ) : (
          <span className="icon-[material-symbols--visibility-outline] text-base-content/50" />
        )}
      </button>
    </Tooltip>
  );
}
