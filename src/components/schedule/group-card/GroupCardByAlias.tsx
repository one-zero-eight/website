import { $schedule } from "@/api/schedule";
import { GroupCard } from "@/components/schedule/group-card/GroupCard";

export function GroupCardByAlias({
  groupAlias,
  canHide = false,
  exportButtonOnClick,
}: {
  groupAlias: string;
  canHide?: boolean;
  exportButtonOnClick?: () => void;
}) {
  const { data: eventGroups } = $schedule.useQuery("get", "/event-groups/");
  const group = eventGroups?.event_groups.find(
    (eventGroup) => eventGroup.alias === groupAlias,
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
