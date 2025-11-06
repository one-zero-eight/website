import { ValidateLinkOptions } from "@tanstack/react-router";

export type LocalLink = {
  type: "local";
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
} & ValidateLinkOptions;

export type ExternalLink = {
  type: "external";
  title: string;
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
};
export type LinkItemType = (LocalLink | ExternalLink) & {
  hideOnMore?: boolean;
  staff_only?: boolean;
};

export const items: ItemType[] = [
  {
    type: "local",
    title: "Search",
    to: "/search",
    icon: <span className="icon-[material-symbols--search]" />,
    badge: (
      <span className="bg-primary ml-2 rounded-full px-2 py-1 text-xs font-semibold text-white">
        NEW
      </span>
    ),
  },
  { type: "separator" },
  {
    type: "local",
    title: "Dashboard",
    to: "/dashboard",
    icon: <span className="icon-[material-symbols--space-dashboard-outline]" />,
    hideOnMore: true,
  },
  {
    type: "local",
    title: "Calendar",
    to: "/calendar",
    icon: (
      <span className="icon-[material-symbols--calendar-month-outline-rounded]" />
    ),
    hideOnMore: true,
  },
  {
    type: "local",
    title: "Maps",
    to: "/maps",
    icon: <span className="icon-[material-symbols--map-outline-rounded]" />,
    hideOnMore: true,
  },
  {
    type: "local",
    title: "Room booking",
    to: "/room-booking",
    icon: (
      <span className="icon-[material-symbols--door-open-outline-rounded]" />
    ),
    hideOnMore: true,
  },
  { type: "separator", hideOnMore: true },
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: "Events",
      to: "/events",
      badge: (
        <span className="ml-2 rounded-full bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
          DEV
        </span>
      ),
      icon: <span className="icon-[material-symbols--campaign-rounded]" />,
    },
  ]),
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: "Clubs",
      badge: (
        <span className="ml-2 rounded-full bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
          DEV
        </span>
      ),
      to: "/clubs",
      icon: <span className="icon-[material-symbols--diversity-1-rounded]" />,
    },
  ]),
  {
    type: "local",
    title: "Schedule",
    to: "/schedule",
    icon: <span className="icon-[mdi--calendars]" />,
  },
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: "Timer",
      badge: (
        <span className="ml-2 rounded-full bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
          DEV
        </span>
      ),
      to: "/timer",
      icon: <span className="icon-[material-symbols--timer-outline-rounded]" />,
    },
  ]),
  {
    type: "local",
    title: "Scholarship",
    to: "/scholarship",
    icon: <span className="icon-[material-symbols--credit-card-outline]" />,
  },
  { type: "separator" },
  {
    type: "local",
    title: "Printers",
    to: "/printers",
    icon: <span className="icon-[material-symbols--print-outline-rounded]" />,
  },
  {
    type: "local",
    title: "Dorms",
    to: "/dorms",
    icon: (
      <span className="icon-[material-symbols--nest-multi-room-outline-rounded]" />
    ),
  },
  {
    type: "local",
    title: "Music room",
    to: "/music-room",
    icon: <span className="icon-[material-symbols--piano]" />,
  },
  {
    type: "local",
    title: "Sport",
    to: "/sport",
    icon: <span className="icon-[material-symbols--exercise-outline]" />,
  },
  {
    type: "local",
    title: "Extension",
    to: "/extension",
    icon: <span className="icon-[material-symbols--extension-outline]" />,
  },
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: "Guard",
      badge: (
        <span className="ml-2 rounded-full bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
          DEV
        </span>
      ),
      to: "/guard",
      icon: (
        <span className="icon-[material-symbols--verified-user-outline-rounded]" />
      ),
    },
  ]),
  {
    type: "local",
    title: "Forms",
    to: "/forms",
    icon: <span className="icon-[material-symbols--description-outline]" />,
    staff_only: true,
    badge: (
      <span className="ml-2 rounded-full bg-yellow-500 px-2 py-1 text-xs font-semibold text-white">
        STAFF
      </span>
    ),
  },
  { type: "separator" },
  {
    type: "external",
    title: "Moodle",
    href: "https://moodle.innopolis.university",
    icon: <span className="icon-[material-symbols--school-outline-rounded]" />,
  },
  {
    type: "external",
    title: "Baam",
    href: "https://baam.tatar/s",
    icon: <span className="icon-[material-symbols--qr-code-rounded]" />,
  },
  {
    type: "external",
    title: "My University",
    href: "https://my.innopolis.university",
    icon: <span className="icon-[material-symbols--account-circle-outline]" />,
  },
];
