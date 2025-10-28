import Tooltip from "@/components/common/Tooltip";
import { useEventGroup } from "@/lib/events/event-group";

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
        className="hover:bg-secondary-hover flex h-12 w-12 items-center justify-center rounded-2xl text-4xl"
      >
        {isHidden ? (
          <span className="icon-[material-symbols--visibility-off-outline] text-contrast/50" />
        ) : (
          <span className="icon-[material-symbols--visibility-outline] text-contrast/50" />
        )}
      </button>
    </Tooltip>
  );
}
