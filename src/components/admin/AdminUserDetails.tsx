import { accountsTypes } from "@/api/accounts";
import {
  getInnohassleWebvisorUrl,
  getSportAdminStudentUrl,
  getSportWebvisorUrl,
  getTelegramProfileUrl,
  getViewUserEmail,
  PredefinedGroupItem,
} from "@/components/admin/utils.ts";
import { PredefinedGroupBadge } from "@/components/admin/PredefinedGroupBadge.tsx";
import { scheduleTypes } from "@/api/schedule";
import { cn } from "@/lib/ui/cn";
import { ReactNode } from "react";

function formatDateTime(value: string | number | null | undefined) {
  if (value == null || value === "") return undefined;

  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatBoolean(value: boolean | null | undefined) {
  if (value == null) return undefined;
  return value ? "Yes" : "No";
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-3 p-4">
      <h3 className="text-xl font-medium">{title}</h3>
      <dl className="grid gap-2">{children}</dl>
    </section>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="text-base-content/75 min-w-40 shrink-0 text-sm">
        {label}
      </dt>
      <dd
        className={cn("min-w-0 flex-1 truncate text-sm", mono && "font-mono")}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function GroupList({
  title,
  items,
  eventGroupsByAlias,
}: {
  title: string;
  items: PredefinedGroupItem[];
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={`${item.label}-${item.alias ?? "no-alias"}`}
            className="max-w-full min-w-0"
          >
            {item.alias ? (
              <PredefinedGroupBadge
                alias={item.alias}
                eventGroupsByAlias={eventGroupsByAlias}
              />
            ) : (
              <span className="bg-base-100 block max-w-full truncate rounded-full px-3 py-1 text-sm">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TelegramLink({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  const href = getTelegramProfileUrl({ username });
  if (!href) return <>{children}</>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="link text-primary block truncate"
    >
      {children}
    </a>
  );
}

export function AdminUserDetails({
  user,
  userGroups,
  academicGroups,
  isPredefinedPending,
  eventGroupsByAlias,
}: {
  user: accountsTypes.SchemaViewUser;
  userGroups: PredefinedGroupItem[];
  academicGroups: PredefinedGroupItem[];
  isPredefinedPending: boolean;
  eventGroupsByAlias: Map<string, scheduleTypes.SchemaViewEventGroup>;
}) {
  const telegramName = [
    user.telegram_info?.first_name,
    user.telegram_info?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const telegramProfileUrl = getTelegramProfileUrl({
    username: user.telegram_info?.username,
    id: user.telegram_info?.id,
  });

  const email = getViewUserEmail(user);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start gap-4">
          {user.telegram_info?.photo_url ? (
            telegramProfileUrl ? (
              <a href={telegramProfileUrl} target="_blank" rel="noreferrer">
                <img
                  src={user.telegram_info.photo_url}
                  alt=""
                  className="border-base-content/20 size-20 rounded-full border-2 object-cover"
                />
              </a>
            ) : (
              <img
                src={user.telegram_info.photo_url}
                alt=""
                className="border-base-content/20 size-20 rounded-full border-2 object-cover"
              />
            )
          ) : (
            <div className="bg-base-100 text-base-content/40 flex size-20 items-center justify-center rounded-full">
              <span className="icon-[material-symbols--person-outline-rounded] text-5xl" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-medium">
              {user.innopolis_info?.name ??
                user.innopolis_sso?.name ??
                telegramName ??
                user.innopolis_info?.email ??
                user.innopolis_sso?.email ??
                user.id}
            </h2>
            <p className="text-base-content/75 mt-1 truncate text-sm">
              {user.innopolis_info?.email ?? user.innopolis_sso?.email ?? "—"}
            </p>
          </div>
        </div>

        <dl className="grid gap-2">
          <InfoRow label="ID" value={user.id} mono />
          <InfoRow
            label="InNoHassle admin"
            value={formatBoolean(user.innohassle_admin)}
          />
        </dl>
      </section>

      {email && (
        <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-3 p-4">
          <h3 className="text-xl font-medium">Analytics</h3>
          <ul className="flex min-w-0 flex-col gap-2">
            <li className="min-w-0">
              <a
                href={getInnohassleWebvisorUrl(email)}
                target="_blank"
                rel="noreferrer"
                className="link text-primary block truncate"
              >
                Webvisor (innohassle.ru)
              </a>
            </li>
            <li className="min-w-0">
              <a
                href={getSportWebvisorUrl(email)}
                target="_blank"
                rel="noreferrer"
                className="link text-primary block truncate"
              >
                Webvisor (sport.innopolis.university)
              </a>
            </li>
            <li className="min-w-0">
              <a
                href={getSportAdminStudentUrl(email)}
                target="_blank"
                rel="noreferrer"
                className="link text-primary block truncate"
              >
                Sport admin
              </a>
            </li>
          </ul>
        </section>
      )}

      <InfoSection title="Innopolis">
        <InfoRow label="Email" value={user.innopolis_info?.email} />
        <InfoRow label="Name" value={user.innopolis_info?.name} />
        <InfoRow
          label="Student"
          value={formatBoolean(user.innopolis_info?.is_student)}
        />
        <InfoRow
          label="Staff"
          value={formatBoolean(user.innopolis_info?.is_staff)}
        />
        <InfoRow
          label="College"
          value={formatBoolean(user.innopolis_info?.is_college)}
        />
        <InfoRow
          label="Updated at"
          value={formatDateTime(user.innopolis_info?.updated_at)}
        />
      </InfoSection>

      <InfoSection title="Preferences">
        {Object.entries(user.preferences ?? {}).length > 0 ? (
          Object.entries(user.preferences ?? {}).map(([key, value]) => (
            <InfoRow key={key} label={key} value={JSON.stringify(value)} mono />
          ))
        ) : (
          <p className="text-base-content/75 text-sm">No preferences.</p>
        )}
      </InfoSection>

      <InfoSection title="Telegram">
        <InfoRow label="ID" value={user.telegram_info?.id} mono />
        <InfoRow label="First name" value={user.telegram_info?.first_name} />
        <InfoRow label="Last name" value={user.telegram_info?.last_name} />
        <InfoRow
          label="Username"
          value={
            user.telegram_info?.username ? (
              <TelegramLink username={user.telegram_info.username}>
                @{user.telegram_info.username}
              </TelegramLink>
            ) : undefined
          }
        />
        <InfoRow
          label="Photo URL"
          value={
            user.telegram_info?.photo_url ? (
              <a
                href={user.telegram_info.photo_url}
                target="_blank"
                rel="noreferrer"
                className="link text-primary block truncate"
              >
                {user.telegram_info.photo_url}
              </a>
            ) : undefined
          }
        />
        <InfoRow
          label="Updated at"
          value={formatDateTime(user.telegram_info?.updated_at)}
        />
        <InfoRow
          label="Sync success"
          value={formatBoolean(user.telegram_update_data?.success)}
        />
        <InfoRow
          label="Sync status code"
          value={user.telegram_update_data?.status_code}
        />
        <InfoRow
          label="Sync error"
          value={user.telegram_update_data?.error_message}
        />
        <InfoRow
          label="Sync updated at"
          value={formatDateTime(user.telegram_update_data?.updated_at)}
        />
      </InfoSection>

      <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-3 p-4">
        <h3 className="text-xl font-medium">Predefined groups</h3>
        {isPredefinedPending ? (
          <div className="skeleton h-20 w-full rounded-xl" />
        ) : (
          <>
            <GroupList
              title="User groups"
              items={userGroups}
              eventGroupsByAlias={eventGroupsByAlias}
            />
            <GroupList
              title="Academic groups"
              items={academicGroups}
              eventGroupsByAlias={eventGroupsByAlias}
            />
            {userGroups.length === 0 && academicGroups.length === 0 && (
              <p className="text-base-content/75 text-sm">
                No predefined groups for this user.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
