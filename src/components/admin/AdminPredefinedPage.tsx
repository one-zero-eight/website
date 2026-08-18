import { $accounts, accountsTypes } from "@/api/accounts";
import { $schedule } from "@/api/schedule";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  AddPredefinedEmailForm,
  RemovePredefinedEmailButton,
} from "@/components/admin/AddPredefinedEmailForm.tsx";
import { AdminUserListItem } from "@/components/admin/AdminUserListItem.tsx";
import {
  buildEventGroupsByAlias,
  PredefinedGroupBadge,
  PredefinedGroupTitle,
} from "@/components/admin/PredefinedGroupBadge.tsx";
import {
  getAcademicGroupKey,
  usePredefinedDataEditor,
} from "@/components/admin/usePredefinedDataEditor.ts";
import { getUserByEmailFromBulk } from "@/components/admin/utils.ts";
import { scheduleTypes } from "@/api/schedule";
import { cn } from "@/lib/ui/cn";
import { useMemo, useState } from "react";

export function AdminPredefinedPage() {
  const {
    data: predefined,
    isPending,
    isError,
    error,
    refetch,
  } = $schedule.useQuery("get", "/get-predefined-data");

  const {
    isPending: isSaving,
    removePredefinedUser,
    addEmailToAcademicGroup,
    removeEmailFromAcademicGroup,
  } = usePredefinedDataEditor(predefined);

  const { data: eventGroupsData } = $schedule.useQuery("get", "/event-groups/");
  const eventGroupsByAlias = useMemo(
    () => buildEventGroupsByAlias(eventGroupsData?.event_groups),
    [eventGroupsData],
  );

  const predefinedUserEmails = useMemo(
    () => predefined?.users?.map((user) => user.email) ?? [],
    [predefined],
  );

  const { data: predefinedUsersByEmail, isPending: isPredefinedUsersPending } =
    $accounts.useQuery(
      "post",
      "/users/by-innomail/get-bulk",
      {
        body: predefinedUserEmails,
      },
      {
        enabled: predefinedUserEmails.length > 0,
      },
    );

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !predefined) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <div className="alert alert-error">
          <span>{formatApiErrorMessage(error)}</span>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Predefined users</h2>
        {!predefined.users?.length ? (
          <p className="text-base-content/75">No predefined users.</p>
        ) : isPredefinedUsersPending ? (
          <UserListSkeleton count={predefined.users.length} />
        ) : (
          <ul className="divide-base-300 border-base-300 divide-y rounded-xl border">
            {predefined.users.map((user) => (
              <li key={user.email}>
                <PredefinedUserItem
                  email={user.email}
                  groups={user.groups}
                  user={getUserByEmailFromBulk(
                    predefinedUsersByEmail,
                    user.email,
                  )}
                  eventGroupsByAlias={eventGroupsByAlias}
                  isSaving={isSaving}
                  onRemove={() => removePredefinedUser(user.email)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Academic groups</h2>
        {!predefined.academic_groups?.length ? (
          <p className="text-base-content/75">No academic groups.</p>
        ) : (
          <ul className="divide-base-300 border-base-300 divide-y rounded-xl border">
            {predefined.academic_groups.map((group, groupIndex) => (
              <li key={getAcademicGroupKey(group)}>
                <AcademicGroupItem
                  group={group}
                  eventGroupsByAlias={eventGroupsByAlias}
                  isSaving={isSaving}
                  onAddEmail={(email) =>
                    addEmailToAcademicGroup(groupIndex, email)
                  }
                  onRemoveEmail={(email) =>
                    removeEmailFromAcademicGroup(groupIndex, email)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function UserListSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: Math.min(count, 5) }).map((_, index) => (
        <div key={index} className="skeleton h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

function PredefinedUserItem({
  email,
  groups,
  user,
  eventGroupsByAlias,
  isSaving,
  onRemove,
}: {
  email: string;
  groups?: string[];
  user: accountsTypes.SchemaViewUser | null;
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
  isSaving: boolean;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasGroups = !!groups?.length;

  return (
    <div className="flex flex-col">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <AdminUserListItem
            user={user ?? undefined}
            notFoundEmail={user ? undefined : email}
          />
        </div>
        {hasGroups && (
          <button
            type="button"
            className="text-base-content/75 hover:text-base-content mt-3 flex shrink-0 items-center gap-1 text-sm"
            onClick={() => setExpanded((value) => !value)}
          >
            <span
              className={cn(
                "icon-[material-symbols--chevron-right-rounded] transition-transform",
                expanded && "rotate-90",
              )}
            />
            {groups!.length} groups
          </button>
        )}
        <div className="mt-2 mr-2">
          <RemovePredefinedEmailButton
            isPending={isSaving}
            onRemove={onRemove}
          />
        </div>
      </div>
      {expanded && hasGroups && (
        <ul className="flex flex-wrap gap-2 px-4 pb-3 pl-4">
          {groups!.map((groupAlias) => (
            <li key={groupAlias}>
              <PredefinedGroupBadge
                alias={groupAlias}
                eventGroupsByAlias={eventGroupsByAlias}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AcademicGroupItem({
  group,
  eventGroupsByAlias,
  isSaving,
  onAddEmail,
  onRemoveEmail,
}: {
  group: {
    name: string;
    event_group_alias?: string | null;
    user_emails?: string[];
  };
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
  isSaving: boolean;
  onAddEmail: (email: string) => boolean;
  onRemoveEmail: (email: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const emails = group.user_emails ?? [];
  const emailCount = emails.length;

  const { data: usersByEmail, isPending: isUsersPending } = $accounts.useQuery(
    "post",
    "/users/by-innomail/get-bulk",
    {
      body: emails,
    },
    {
      enabled: expanded && emailCount > 0,
    },
  );

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="hover:bg-base-200 -ml-1 flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5"
          onClick={() => setExpanded((value) => !value)}
        >
          <span
            className={cn(
              "icon-[material-symbols--chevron-right-rounded] transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>
        <div className="min-w-0 flex-1">
          <PredefinedGroupTitle
            alias={group.event_group_alias}
            fallbackName={group.name}
            eventGroupsByAlias={eventGroupsByAlias}
          />
        </div>
        <span className="text-base-content/75 shrink-0 text-sm">
          ({emailCount})
        </span>
      </div>
      {expanded && (
        <div className="flex flex-col gap-3 pl-5">
          <AddPredefinedEmailForm
            placeholder="Add email to this group..."
            isPending={isSaving}
            onAdd={onAddEmail}
          />
          {emailCount === 0 ? (
            <p className="text-base-content/75 text-sm">
              No users in this group.
            </p>
          ) : isUsersPending ? (
            <UserListSkeleton count={emailCount} />
          ) : (
            <ul className="divide-base-300 border-base-300 divide-y rounded-xl border">
              {emails.map((email) => {
                const user = getUserByEmailFromBulk(usersByEmail, email);

                return (
                  <li key={email} className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <AdminUserListItem
                        user={user ?? undefined}
                        notFoundEmail={user ? undefined : email}
                      />
                    </div>
                    <RemovePredefinedEmailButton
                      isPending={isSaving}
                      onRemove={() => onRemoveEmail(email)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
