import { clubsTypes } from "@/api/clubs";
import { t, plural } from "@lingui/core/macro";

export const clubTypesOrder: clubsTypes.ClubType[] = [
  clubsTypes.ClubType.tech,
  clubsTypes.ClubType.sport,
  clubsTypes.ClubType.hobby,
  clubsTypes.ClubType.art,
];

export function getClubTypeDescription(type: clubsTypes.ClubType): string {
  switch (type) {
    case clubsTypes.ClubType.tech:
      return t`Clubs focused on technology, programming, engineering, robotics, and other technical disciplines.`;
    case clubsTypes.ClubType.sport:
      return t`Clubs centered around physical activities, sports, and fitness. Can give sport hours for trainings if accredited on InnoSport.`;
    case clubsTypes.ClubType.hobby:
      return t`Clubs focused on hobbies, special interests, and community activities that don't fit other categories.`;
    case clubsTypes.ClubType.art:
      return t`Clubs dedicated to artistic expression, cultural activities, and creative pursuits.`;
    default:
      return type;
  }
}

export const clubTypeIcon: Record<clubsTypes.ClubType, string> = {
  [clubsTypes.ClubType.tech]: "icon-[material-symbols--code]",
  [clubsTypes.ClubType.sport]: "icon-[material-symbols--sports-soccer]",
  [clubsTypes.ClubType.hobby]: "icon-[material-symbols--interests-outline]",
  [clubsTypes.ClubType.art]: "icon-[material-symbols--palette-outline]",
};

export function getClubTypeLabel(type: clubsTypes.ClubType): string {
  switch (type) {
    case "tech":
      return t`Technical`;
    case "sport":
      return t({ message: "Sport", context: "club type" });
    case "hobby":
      return t`Special Interest`;
    case "art":
      return t`Art / Culture`;
    default:
      return type;
  }
}

export function clubsCountLabel(count: number): string {
  return t`${plural(count, { one: "# club", other: "# clubs" })}`;
}

export function getClubTypeColor(type: clubsTypes.ClubType): string {
  switch (type) {
    case "tech":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "sport":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "hobby":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "art":
      return "bg-pink-500/10 text-pink-600 dark:text-pink-400";
    default:
      return "bg-base-200 text-base-content/50";
  }
}

export function getLinkIconClass(linkType: clubsTypes.LinkType): string {
  switch (linkType) {
    case "telegram_channel":
    case "telegram_chat":
    case "telegram_user":
      return "icon-[mdi--telegram]";
    case "external_url":
      return "icon-[mdi--open-in-new]";
    default:
      return "icon-[mdi--open-in-new]";
  }
}

export function getLinkLabel(linkType: clubsTypes.LinkType): string {
  switch (linkType) {
    case "telegram_channel":
      return t`Channel`;
    case "telegram_chat":
      return t`Chat`;
    case "telegram_user":
      return t`Contact`;
    case "external_url":
      return t`Website`;
    default:
      return t`Link`;
  }
}
