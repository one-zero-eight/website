import { $events } from "@/api/events";
import { GroupCard } from "@/components/schedule/group-card/GroupCard";

export type GroupCardProps = {
  groupId?: number;
  canHide?: boolean;
  exportButtonOnClick?: () => void;
};

export function GroupCardById({
  groupId,
  canHide = false,
  exportButtonOnClick,
}: GroupCardProps) {
  const { data: eventGroups } = $events.useQuery("get", "/event-groups/");
  if (groupId === undefined) return null;
  const group = eventGroups?.event_groups?.find(
    (group) => group.id === groupId,
  );
  if (!group) return null;
  return (
    <GroupCard
      group={group}
      canHide={canHide}
      exportButtonOnClick={exportButtonOnClick}
    />
  );
}
