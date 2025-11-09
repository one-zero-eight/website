import { clubsTypes } from "@/api/clubs";

export const clubTypesOrder: clubsTypes.ClubType[] = [
  clubsTypes.ClubType.tech,
  clubsTypes.ClubType.sport,
  clubsTypes.ClubType.hobby,
  clubsTypes.ClubType.art,
];

export const clubTypeDescription: Record<clubsTypes.ClubType, string> = {
  [clubsTypes.ClubType.tech]:
    "Clubs focused on technology, programming, engineering, robotics, and other technical disciplines.",
  [clubsTypes.ClubType.sport]:
    "Clubs centered around physical activities, sports, and fitness. Can give sport hours for trainings if accredited on InnoSport.",
  [clubsTypes.ClubType.hobby]:
    "Clubs focused on hobbies, special interests, and community activities that don't fit other categories.",
  [clubsTypes.ClubType.art]:
    "Clubs dedicated to artistic expression, cultural activities, and creative pursuits.",
};

export const clubTypeIcon: Record<clubsTypes.ClubType, string> = {
  [clubsTypes.ClubType.tech]: "icon-[material-symbols--code]",
  [clubsTypes.ClubType.sport]: "icon-[material-symbols--sports-soccer]",
  [clubsTypes.ClubType.hobby]: "icon-[material-symbols--interests-outline]",
  [clubsTypes.ClubType.art]: "icon-[material-symbols--palette-outline]",
};

export function getClubTypeLabel(type: clubsTypes.ClubType): string {
  switch (type) {
    case "tech":
      return "Technical";
    case "sport":
      return "Sport";
    case "hobby":
      return "Special Interest";
    case "art":
      return "Art / Culture";
    default:
      return type;
  }
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
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
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
      return "Channel";
    case "telegram_chat":
      return "Chat";
    case "telegram_user":
      return "Contact";
    case "external_url":
      return "Website";
    default:
      return "Link";
  }
}
