/**
 * Docs: menu item badge and DEV flag
 *
 * 1) How to add a badge:
 * - Add `badge` field to a link item in `items`.
 * - Example:
 *   badge: (
 *     <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-medium text-mauve-800">
 *       STAFF
 *     </span>
 *   )
 *
 * 2) How to add a DEV-only item:
 *   ...((import.meta.env.VITE_PRODUCTION && []) || [
 *     {
 *       type: "local",
 *       title: msg`Events`,
 *       to: "/events",
 *       badge: (
 *         <span className="ml-2 rounded-full bg-mauve-500 px-2 py-0.5 text-xs font-medium text-mauve-100">
 *           DEV
 *         </span>
 *       ),
 *       icon: <span className="icon-[material-symbols--campaign-rounded]" />,
 *     },
 *   ]),
 */
import { accountsTypes } from "@/api/accounts";
import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";
import { ValidateLinkOptions } from "@tanstack/react-router";

export type LocalLink = {
  type: "local";
  title: MessageDescriptor;
  icon: React.ReactNode;
  badge?: React.ReactNode;
} & ValidateLinkOptions;

export type ExternalLink = {
  type: "external";
  title: MessageDescriptor;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  href: string;
};
export type SeparatorItem = {
  type: "separator";
};
export type ItemType = (LocalLink | ExternalLink | SeparatorItem) & {
  hideOnMore?: boolean;
  staff_only?: boolean;
  innohassle_admin_only?: boolean;
};
export type LinkItemType = (LocalLink | ExternalLink) & {
  hideOnMore?: boolean;
  staff_only?: boolean;
  innohassle_admin_only?: boolean;
};

export function isMenuItemVisible(
  item: ItemType,
  me: accountsTypes.SchemaViewUser | null | undefined,
  isImpersonating = false,
) {
  if (item.type === "separator") return true;

  if (
    item.staff_only &&
    !(
      me?.innopolis_info?.is_staff ||
      me?.id === "65f6ef2847289ea08482e3bf" ||
      !import.meta.env.VITE_PRODUCTION
    )
  ) {
    return false;
  }

  if (item.innohassle_admin_only && !me?.innohassle_admin && !isImpersonating) {
    return false;
  }

  return true;
}

export const items: ItemType[] = [
  // Our flagman services:
  {
    type: "local",
    title: msg`Search`,
    to: "/search",
    icon: <span className="icon-[material-symbols--search]" />,
  },
  { type: "separator" },
  {
    type: "local",
    title: msg`Dashboard`,
    to: "/dashboard",
    icon: <span className="icon-[material-symbols--space-dashboard-outline]" />,
    hideOnMore: true,
  },
  {
    type: "local",
    title: msg`Calendar`,
    to: "/calendar",
    icon: (
      <span className="icon-[material-symbols--calendar-month-outline-rounded]" />
    ),
    hideOnMore: true,
  },
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: msg`Sport`,
      to: "/sport",
      badge: (
        <span className="ml-2 rounded-full bg-mauve-500 px-2 py-0.5 text-xs font-medium text-mauve-100">
          DEV
        </span>
      ),
      icon: <span className="icon-[material-symbols--exercise-outline]" />,
    },
  ]),
  {
    type: "local",
    title: msg`Maps`,
    to: "/maps",
    icon: <span className="icon-[material-symbols--map-outline-rounded]" />,
    hideOnMore: true,
  },
  {
    type: "local",
    title: msg`Room booking`,
    to: "/room-booking",
    icon: (
      <span className="icon-[material-symbols--door-open-outline-rounded]" />
    ),
    hideOnMore: true,
  },
  { type: "separator", hideOnMore: true },
  // On-site services:
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: msg`Timetable`,
      to: "/timetable",
      badge: (
        <span className="ml-2 rounded-full bg-mauve-500 px-2 py-0.5 text-xs font-medium text-mauve-100">
          DEV
        </span>
      ),
      icon: (
        <span className="icon-[material-symbols--calendar-view-week-outline]" />
      ),
    },
  ]),
  {
    type: "local",
    title: msg`Schedule`,
    to: "/schedule",
    icon: <span className="icon-[mdi--calendars]" />,
  },
  {
    type: "local",
    title: msg`Events`,
    to: "/events",
    icon: <span className="icon-[material-symbols--campaign-rounded]" />,
  },
  {
    type: "local",
    title: msg`Clubs`,
    to: "/clubs",
    icon: <span className="icon-[material-symbols--diversity-1-rounded]" />,
  },
  {
    type: "local",
    title: msg`Printers`,
    to: "/printers",
    icon: <span className="icon-[material-symbols--print-outline-rounded]" />,
  },
  {
    type: "local",
    title: msg`When2meet`,
    to: "/when2meet",
    badge: (
      <span className="bg-primary ml-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
        NEW
      </span>
    ),
    icon: <span className="icon-[mdi--calendar-outline]" />,
  },
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: msg`Board games`,
      to: "/board-games",
      badge: (
        <span className="ml-2 rounded-full bg-mauve-500 px-2 py-0.5 text-xs font-medium text-mauve-100">
          DEV
        </span>
      ),
      icon: (
        <span className="icon-[mdi--cards-playing-heart-multiple-outline]" />
      ),
    },
  ]),
  {
    type: "local",
    title: msg`Timer`,
    to: "/timer",
    icon: <span className="icon-[material-symbols--timer-outline-rounded]" />,
  },
  {
    type: "local",
    title: msg`Scholarship`,
    to: "/scholarship",
    icon: <span className="icon-[material-symbols--credit-card-outline]" />,
  },
  { type: "separator" },
  // Informational pages about our services on external platforms: bots, extensions, etc.:
  {
    type: "local",
    title: msg`Dorms`,
    to: "/dorms",
    icon: (
      <span className="icon-[material-symbols--nest-multi-room-outline-rounded]" />
    ),
  },
  {
    type: "local",
    title: msg`Music room`,
    to: "/music-room",
    icon: <span className="icon-[material-symbols--piano]" />,
  },
  {
    type: "local",
    title: msg`Extension`,
    to: "/extension",
    icon: <span className="icon-[material-symbols--extension-outline]" />,
  },
  // Services for small audience:
  {
    type: "local",
    title: msg`Forms`,
    to: "/forms",
    icon: <span className="icon-[material-symbols--description-outline]" />,
    staff_only: true,
    badge: (
      <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-medium text-mauve-800">
        STAFF
      </span>
    ),
  },
  {
    type: "local",
    title: msg`Admin`,
    to: "/admin",
    icon: (
      <span className="icon-[material-symbols--admin-panel-settings-outline-rounded]" />
    ),
    innohassle_admin_only: true,
  },
  {
    type: "local",
    title: msg`Student Affairs`,
    to: "/student-affairs",
    icon: (
      <span className="icon-[material-symbols--live-help-outline-rounded]" />
    ),
  },
  { type: "separator" },
  // External services:
  {
    type: "external",
    title: msg`Moodle`,
    href: "https://moodle.innopolis.university",
    icon: <span className="icon-[material-symbols--school-outline-rounded]" />,
  },
  {
    type: "external",
    title: msg`Baam`,
    href: "https://baam.tatar/s",
    icon: <span className="icon-[material-symbols--qr-code-rounded]" />,
  },
  {
    type: "external",
    title: msg`My University`,
    href: "https://my.innopolis.university",
    icon: <span className="icon-[material-symbols--account-circle-outline]" />,
  },
];
