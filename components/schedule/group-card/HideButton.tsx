import Tooltip from "@/components/common/Tooltip";
import { useEventGroup } from "@/lib/event-group";

export default function HideButton({ groupId }: { groupId: number }) {
  const { isHidden, switchHideFavorite } = useEventGroup(groupId);
  return (
    <Tooltip content={isHidden ? "Hidden from calendar" : "Hide from calendar"}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          switchHideFavorite && switchHideFavorite();
        }}
        className="h-52 w-52 rounded-2xl p-2 text-4xl hover:bg-secondary-hover"
      >
        {isHidden ? (
          <span className="icon-[material-symbols--visibility-off-outline] text-icon-main/50" />
        ) : (
          <span className="icon-[material-symbols--visibility-outline] text-icon-main/50" />
        )}
      </button>
    </Tooltip>
  );
}
