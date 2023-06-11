"use client";
import Link from "next/link";
import React from "react";
import CanteenIcon from "./icons/CanteenIcon";
import FormsIcon from "./icons/FormsIcon";
import LaundryIcon from "./icons/LaundryIcon";
import Logo from "./icons/Logo";
import ScheduleIcon from "./icons/ScheduleIcon";
import ScholarshipIcon from "./icons/ScholarshipIcon";
import SidebarSection from "./SidebarSection";

type Item = {
  title: string;
  path: string;
  icon: (props: { className?: string; fill?: string }) => React.JSX.Element;
};

const items: Item[] = [
  { title: "Schedule", path: "/schedule", icon: ScheduleIcon },
  { title: "Laundry", path: "#", icon: LaundryIcon },
  { title: "Forms", path: "#", icon: FormsIcon },
  { title: "Canteen", path: "#", icon: CanteenIcon },
  { title: "Scholarship", path: "#", icon: ScholarshipIcon },
];

function Sidebar() {
  const selection = "Schedule";

  return (
    <aside className="hidden sm:flex bg-background flex-col items-center py-4 px-8 h-[100dvh] sticky top-0">
      <Link href="/" className="mb-8">
        <Logo className="h-16" />
      </Link>
      <nav className="flex flex-col">
        {items.map((item) => {
          return (
            <SidebarSection
              key={item.title}
              title={item.title}
              icon={item.icon}
              selected={selection === item.title}
              path={item.path}
            />
          );
        })}
      </nav>
      <div className="grow"></div>
      <a href="https://t.me/one_zero_eight">one-zero-eight 💜</a>
    </aside>
  );
}

export default Sidebar;
