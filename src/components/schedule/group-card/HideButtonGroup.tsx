import { useEventGroup } from "@/api/schedule/event-group.ts";
import HideButtonUI from "@/components/schedule/HideButtonUI.tsx";

export default function HideButtonGroup({
  groupAlias,
}: {
  groupAlias: string;
}) {
  const { isHidden, switchHideFavorite } = useEventGroup(groupAlias);
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
