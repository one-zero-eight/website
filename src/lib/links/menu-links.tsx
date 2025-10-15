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
  {
    type: "local",
    title: "Workshops",
    to: "/workshops",
    icon: <span className="icon-[material-symbols--construction-rounded]" />,
  },
  ...((import.meta.env.VITE_PRODUCTION && []) || [
    {
      type: "local",
      title: "Catalogue",
      badge: (
        <span className="ml-2 rounded-full bg-brand-violet px-2 py-1 text-xs font-semibold text-white">
          NEW
        </span>
      ),
      to: "/catalogue",
      icon: <span className="icon-[material-symbols--book-5-rounded]" />,
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
        <span className="ml-2 rounded-full bg-brand-violet px-2 py-1 text-xs font-semibold text-white">
          NEW
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
        <span className="ml-2 rounded-full bg-brand-violet px-2 py-1 text-xs font-semibold text-white">
          NEW
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
    title: "My University",
    link: "https://my.innopolis.university",
    icon: <span className="icon-[material-symbols--account-circle-outline]" />,
  },
];
