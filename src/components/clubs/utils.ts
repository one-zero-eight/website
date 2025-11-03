import { clubsTypes } from "@/api/clubs";

export const clubTypesOrder: clubsTypes.ClubType[] = [
  clubsTypes.ClubType.tech,
  clubsTypes.ClubType.sport,
  clubsTypes.ClubType.hobby,
  clubsTypes.ClubType.art,
];

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
