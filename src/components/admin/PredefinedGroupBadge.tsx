import { scheduleTypes } from "@/api/schedule";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";

export function buildEventGroupsByAlias(
  eventGroups: scheduleTypes.SchemaViewEventGroup[] | undefined,
) {
  const map = new Map<string, scheduleTypes.SchemaViewEventGroup>();

  eventGroups?.forEach((group) => {
    map.set(group.alias.toLowerCase(), group);
  });

  return map;
}

export function getEventGroupByAlias(
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>,
  alias: string | null | undefined,
) {
  if (!alias) return undefined;
  return eventGroupsByAlias.get(alias.toLowerCase());
}

function PredefinedGroupAliasLink({
  alias,
  className,
}: {
  alias: string;
  className?: string;
}) {
  return (
    <Link
      to="/schedule/event-groups/$alias"
      params={{ alias }}
      className={cn("link text-primary shrink-0", className)}
      title={alias}
    >
      {alias}
    </Link>
  );
}

export function PredefinedGroupBadge({
  alias,
  eventGroupsByAlias,
  className,
}: {
  alias: string;
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
  className?: string;
}) {
  const eventGroup = getEventGroupByAlias(eventGroupsByAlias, alias);
  const name = eventGroup?.name;

  if (!eventGroup) {
    return (
      <span
        className={cn(
          "bg-base-100 text-error inline-flex max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-full px-3 py-1 text-sm",
          className,
        )}
        title={`${alias} — Not in schedule`}
      >
        <span className="min-w-0 truncate">{alias}</span>
        <span className="shrink-0">— Not in schedule</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "bg-base-100 inline-flex max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-full px-3 py-1 text-sm",
        className,
      )}
    >
      {name && name !== alias && (
        <span className="min-w-0 truncate font-medium" title={name}>
          {name}
        </span>
      )}
      <PredefinedGroupAliasLink alias={eventGroup.alias} />
    </span>
  );
}

export function PredefinedGroupTitle({
  alias,
  fallbackName,
  eventGroupsByAlias,
}: {
  alias?: string | null;
  fallbackName: string;
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
}) {
  if (!alias) {
    return (
      <span className="block min-w-0 truncate font-medium" title={fallbackName}>
        {fallbackName}
      </span>
    );
  }

  const eventGroup = getEventGroupByAlias(eventGroupsByAlias, alias);
  const name = eventGroup?.name;
  const displayName =
    (name && name !== alias) || (!name && fallbackName !== alias)
      ? (name ?? fallbackName)
      : null;

  if (!eventGroup) {
    return (
      <span className="flex min-w-0 items-center gap-2 overflow-hidden">
        <span className="min-w-0 truncate font-medium" title={fallbackName}>
          {fallbackName}
        </span>
        <span className="text-error shrink-0 text-sm">
          {alias} — Not in schedule
        </span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2 overflow-hidden">
      {displayName && (
        <span className="min-w-0 truncate font-medium" title={displayName}>
          {displayName}
        </span>
      )}
      <PredefinedGroupAliasLink alias={eventGroup.alias} className="text-sm" />
    </span>
  );
}
