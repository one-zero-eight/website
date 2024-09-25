import { GroupCard } from "@/components/schedule/group-card/GroupCard";
import { events } from "@/lib/events";

export type GroupCardProps = {
  groupId?: number;
  canHide?: boolean;
};

export function GroupCardById({ groupId, canHide = false }: GroupCardProps) {
  const { data: eventGroups } = events.useEventGroupsListEventGroups();
  if (groupId === undefined) return null;
  const group = eventGroups?.event_groups?.find(
    (group) => group.id === groupId,
  );
  if (!group) return null;
  return <GroupCard group={group} canHide={canHide} />;
}
