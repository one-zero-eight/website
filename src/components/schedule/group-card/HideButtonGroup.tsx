import { useEventGroup } from "@/api/schedule/event-group.ts";
import HideButtonUI from "@/components/schedule/HideButtonUI.tsx";

export default function HideButtonGroup({ groupId }: { groupId: number }) {
  const { isHidden, switchHideFavorite } = useEventGroup(groupId);
  return (
    <HideButtonUI
      isHidden={isHidden}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        switchHideFavorite?.();
      }}
    />
  );
}
