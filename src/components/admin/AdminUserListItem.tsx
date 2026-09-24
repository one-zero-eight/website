import { $schedule, scheduleTypes } from "@/api/schedule";
import { accountsTypes } from "@/api/accounts";
import {
  buildEventGroupsByAlias,
  getEventGroupByAlias,
} from "@/components/admin/PredefinedGroupBadge.tsx";
import {
  getPredefinedGroupsForEmail,
  getViewUserContactLine,
  getViewUserEmail,
  getViewUserName,
  getViewUserRoleBadges,
  PredefinedGroupItem,
} from "@/components/admin/utils.ts";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import { ReactNode, useMemo } from "react";

export function AdminUserListItem({
  user,
  notFoundEmail,
  onSelect,
  selected,
}: {
  user?: accountsTypes.SchemaViewUser | null;
  notFoundEmail?: string;
  onSelect?: (user: accountsTypes.SchemaViewUser) => void;
  selected?: boolean;
}) {
  const { data: predefined } = $schedule.useQuery(
    "get",
    "/get-predefined-data",
  );
  const { data: eventGroupsData } = $schedule.useQuery("get", "/event-groups/");
  const eventGroupsByAlias = useMemo(
    () => buildEventGroupsByAlias(eventGroupsData?.event_groups),
    [eventGroupsData],
  );
  const email = user ? getViewUserEmail(user) : notFoundEmail;
  const { userGroups, academicGroups } = getPredefinedGroupsForEmail(
    predefined,
    email,
  );
  const groups = [...academicGroups, ...userGroups];

  if (user) {
    const content = (
      <UserCardContent
        name={getViewUserName(user)}
        photoUrl={user.telegram_info?.photo_url}
        roleBadges={getViewUserRoleBadges(user)}
        contactLine={getViewUserContactLine(user)}
        groups={groups}
        eventGroupsByAlias={eventGroupsByAlias}
      />
    );

    if (onSelect) {
      return (
        <button
          type="button"
          className={cn(
            "hover:bg-base-200 flex w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors",
            selected && "bg-base-200",
          )}
          onClick={() => onSelect(user)}
        >
          {content}
        </button>
      );
    }

    return (
      <Link
        to="/admin/users/$id"
        params={{ id: user.id }}
        className="hover:bg-base-200 flex min-w-0 items-start gap-3 px-4 py-3 transition-colors"
      >
        {content}
      </Link>
    );
  }

  if (notFoundEmail) {
    return (
      <div className="flex min-w-0 items-start gap-3 px-4 py-3">
        <UserAvatar />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium">{notFoundEmail}</span>
          <span className="text-error text-sm">User not found</span>
          <PredefinedGroupLabels
            groups={groups}
            eventGroupsByAlias={eventGroupsByAlias}
          />
        </div>
      </div>
    );
  }

  return null;
}

function UserCardContent({
  name,
  photoUrl,
  roleBadges,
  contactLine,
  groups,
  eventGroupsByAlias,
}: {
  name: string;
  photoUrl?: string | null;
  roleBadges: string[];
  contactLine: string;
  groups: PredefinedGroupItem[];
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
}): ReactNode {
  return (
    <>
      <UserAvatar photoUrl={photoUrl} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          {roleBadges.map((role) => (
            <span
              key={role}
              className="bg-base-300 rounded-full px-2 py-0.5 text-xs font-medium"
            >
              {role}
            </span>
          ))}
        </div>
        <span className="text-base-content/75 truncate text-sm">
          {contactLine}
        </span>
        <PredefinedGroupLabels
          groups={groups}
          eventGroupsByAlias={eventGroupsByAlias}
        />
      </div>
    </>
  );
}

function UserAvatar({ photoUrl }: { photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="border-base-content/20 size-12 shrink-0 rounded-full border object-cover"
      />
    );
  }

  return (
    <div className="bg-base-200 text-base-content/40 flex size-12 shrink-0 items-center justify-center rounded-full">
      <span className="icon-[material-symbols--person-outline-rounded] text-2xl" />
    </div>
  );
}

function getGroupDisplayName(
  group: PredefinedGroupItem,
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>,
) {
  const eventGroup = getEventGroupByAlias(eventGroupsByAlias, group.alias);
  return eventGroup?.name ?? group.label;
}

function PredefinedGroupLabels({
  groups,
  eventGroupsByAlias,
}: {
  groups: PredefinedGroupItem[];
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {groups.map((group) => {
        const name = getGroupDisplayName(group, eventGroupsByAlias);

        return (
          <span
            key={`${group.label}-${group.alias ?? "no-alias"}`}
            className="bg-primary/10 text-primary max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium"
            title={group.alias ?? name}
          >
            {name}
          </span>
        );
      })}
    </div>
  );
}
