import { LinkOptions } from "@tanstack/react-router";

export type LocalLink = {
  type: "local";
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
} & Pick<LinkOptions, "to">;
export type ExternalLink = {
  type: "external";
  title: string;
  link: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
};
export type SeparatorItem = {
  type: "separator";
};
export type ItemType = (LocalLink | ExternalLink | SeparatorItem) & {
  hideOnMore?: boolean;
};

export const items: ItemType[] = [
  ...((import.meta.env.VITE_HIDE_SEARCH && []) || [
    {
      type: "local",
      title: "Search",
      to: "/search",
      icon: <span className="icon-[material-symbols--search]" />,
      badge: (
        <span className="ml-2 rounded-full bg-brand-violet px-2 py-1 text-xs font-semibold text-white">
          NEW
        </span>
      ),
      hideOnMore: true,
    },
    { type: "separator", hideOnMore: true },
  ]),
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
  {
    type: "local",
    title: "Schedule",
    to: "/schedule",
    icon: <span className="icon-[mdi--calendars]" />,
  },
  {
    type: "local",
    title: "Scholarship",
    to: "/scholarship",
    icon: <span className="icon-[material-symbols--credit-card-outline]" />,
  },
  {
    type: "local",
    title: "Printers",
    to: "/printers",
    icon: <span className="icon-[material-symbols--print-outline-rounded]" />,
    badge: (
      <span className="ml-2 rounded-full bg-brand-violet px-2 py-1 text-xs font-semibold text-white">
        NEW
      </span>
    ),
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
  { type: "separator" },
  {
    type: "external",
    title: "Moodle",
    link: "https://moodle.innopolis.university",
    icon: <span className="icon-[material-symbols--school-outline-rounded]" />,
  },
  {
    type: "external",
    title: "Baam",
    link: "https://baam.tatar/s",
    icon: <span className="icon-[material-symbols--qr-code-rounded]" />,
  },
  {
    type: "external",
    title: "Innopoints",
    link: "https://my.innopolis.university/event",
    icon: <span className="icon-[material-symbols--loyalty-outline-rounded]" />,
  },
  {
    type: "external",
    title: "My University",
    link: "https://my.university.innopolis.ru",
    icon: <span className="icon-[material-symbols--account-circle-outline]" />,
  },
];
