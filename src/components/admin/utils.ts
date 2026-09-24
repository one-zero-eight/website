import { accountsTypes } from "@/api/accounts";
import { scheduleTypes } from "@/api/schedule";

export function isInnohassleAdmin(
  me: accountsTypes.SchemaViewUser | null | undefined,
) {
  return !!me?.innohassle_admin;
}

export function getViewUserEmail(user: accountsTypes.SchemaViewUser) {
  return user.innopolis_info?.email ?? user.innopolis_sso?.email;
}

export function getViewUserName(user: accountsTypes.SchemaViewUser) {
  return (
    user.innopolis_info?.name ??
    user.innopolis_sso?.name ??
    getViewUserEmail(user) ??
    user.id
  );
}

export function getViewUserTelegramLabel(user: accountsTypes.SchemaViewUser) {
  if (user.telegram_info?.username) {
    return `@${user.telegram_info.username}`;
  }

  if (user.telegram_info) {
    return `Telegram ID ${user.telegram_info.id}`;
  }

  return "No Telegram";
}

export function getViewUserRoleBadges(user: accountsTypes.SchemaViewUser) {
  const info = user.innopolis_info ?? user.innopolis_sso;
  return [
    info?.is_staff && "Staff",
    info?.is_student && "Student",
    info?.is_college && "College",
  ].filter((role): role is string => !!role);
}

export function getViewUserContactLine(user: accountsTypes.SchemaViewUser) {
  return [
    getViewUserEmail(user) ?? user.id,
    getViewUserTelegramLabel(user),
  ].join(", ");
}

export function getViewUserRoles(user: accountsTypes.SchemaViewUser) {
  const info = user.innopolis_info ?? user.innopolis_sso;
  return [
    info?.is_staff && "Staff",
    info?.is_student && "Student",
    info?.is_college && "College",
    user.innohassle_admin && "InNoHassle admin",
  ]
    .filter(Boolean)
    .join(", ");
}

export type PredefinedGroupItem = {
  label: string;
  alias?: string | null;
};

export function getPredefinedGroupsForEmail(
  predefined: scheduleTypes.SchemaJsonPredefinedUsers | undefined,
  email: string | undefined,
) {
  if (!predefined || !email) {
    return {
      userGroups: [] as PredefinedGroupItem[],
      academicGroups: [] as PredefinedGroupItem[],
    };
  }

  const normalizedEmail = email.toLowerCase();
  const userGroups =
    predefined.users
      ?.find((user) => user.email.toLowerCase() === normalizedEmail)
      ?.groups?.map((group) => ({
        label: group,
        alias: group,
      })) ?? [];

  const academicGroups =
    predefined.academic_groups
      ?.filter((group) =>
        group.user_emails?.some(
          (groupEmail) => groupEmail.toLowerCase() === normalizedEmail,
        ),
      )
      .map((group) => ({
        label: group.name,
        alias: group.event_group_alias,
      })) ?? [];

  return { userGroups, academicGroups };
}

export function getUserByEmailFromBulk(
  usersByEmail: Record<string, accountsTypes.SchemaViewUser | null> | undefined,
  email: string,
) {
  if (!usersByEmail) return null;

  if (email in usersByEmail) {
    return usersByEmail[email];
  }

  const normalizedEmail = email.toLowerCase();
  const matchedKey = Object.keys(usersByEmail).find(
    (key) => key.toLowerCase() === normalizedEmail,
  );

  return matchedKey ? usersByEmail[matchedKey] : null;
}

const INNOHASSLE_METRIKA_COUNTER_ID = 92392077;
const SPORT_METRIKA_COUNTER_ID = 106958157;

function buildMetrikaWebvisorUrl(counterId: number, email: string) {
  const filter = `(EXISTS ym:up:specialUser WITH (EXISTS(ym:up:paramsLevel1=='email' and ym:up:paramsLevel2=='${email}')))`;

  const params = new URLSearchParams({
    period: "week",
    filter,
    id: String(counterId),
    group: "day",
    isMinSamplingEnabled: "false",
    currency: "RUB",
    attr: JSON.stringify({
      attributionId: "LastSign",
      isCrossDevice: true,
    }),
    isUndefinedEnabled: "false",
  });

  return `https://metrika.yandex.ru/stat/visor?${params.toString()}`;
}

export function getInnohassleWebvisorUrl(email: string) {
  return buildMetrikaWebvisorUrl(INNOHASSLE_METRIKA_COUNTER_ID, email);
}

export function getSportWebvisorUrl(email: string) {
  return buildMetrikaWebvisorUrl(SPORT_METRIKA_COUNTER_ID, email);
}

export function getSportAdminStudentUrl(email: string) {
  const params = new URLSearchParams({ q: email });
  return `https://sport.innopolis.university/admin/sport/student/?${params.toString()}`;
}

export function getTelegramProfileUrl({
  username,
  id,
}: {
  username?: string | null;
  id?: number | null;
}) {
  if (username) {
    return `https://telegram.me/${username.replace(/^@/, "")}`;
  }

  if (id != null) {
    return `tg://user?id=${id}`;
  }

  return undefined;
}
