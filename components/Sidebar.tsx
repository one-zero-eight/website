"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import CanteenIcon from "./icons/CanteenIcon";
import FormsIcon from "./icons/FormsIcon";
import LaundryIcon from "./icons/LaundryIcon";
import Logo from "./icons/Logo";
import ScheduleIcon from "./icons/ScheduleIcon";
import ScholarshipIcon from "./icons/ScholarshipIcon";
import SidebarSection from "./SidebarSection";
import DashboardIcon from "@/components/icons/DashboardIcon";
import { MenuIcon } from "@/components/icons/MenuIcon";

type Item = {
  title: string;
  path: string;
  icon: (props: { className?: string; fill?: string }) => React.JSX.Element;
};

const items: Item[] = [
  { title: "Dashboard", path: "/dashboard", icon: DashboardIcon },
  { title: "Schedule", path: "/schedule", icon: ScheduleIcon },
  { title: "Laundry", path: "#", icon: LaundryIcon },
  { title: "Forms", path: "#", icon: FormsIcon },
  { title: "Canteen", path: "#", icon: CanteenIcon },
  { title: "Scholarship", path: "#", icon: ScholarshipIcon },
];

function Sidebar() {
  const pathname = usePathname();
  const currentItem = items.find((v) => pathname.startsWith(v.path));
  const selection = currentItem?.title;
  const [isOpened, setOpened] = useState(false);
  console.log(isOpened);
  return (
    <>
      <div className="smw-mdh:hidden absolute flex flex-col">
        <aside
          className={
            "flex-col justify-center items-center z-[3] opacity-[0.999] py-8 px-8 h-[100dvh] top-0 " +
            (isOpened ? "bg-background" : "bg-none")
          }
        >
          <button onClick={() => setOpened(!isOpened)}>
            <MenuIcon width={36} height={36} color={"fill-white"} />
          </button>
          <div
            className={
              isOpened
                ? "flex flex-col items-center opacity-100"
                : "hidden opacity-0"
            }
          >
            <Link href="/" className="flex mb-8">
              <Logo className="h-16" />
            </Link>
            <nav className="flex-col">
              {items.map((item) => (
                <div key={item.path} onClick={() => setOpened(false)}>
                  <SidebarSection
                    key={item.title}
                    title={item.title}
                    icon={item.icon}
                    selected={selection === item.title}
                    path={item.path}
                  />
                </div>
              ))}
            </nav>
            <div className="flex grow"></div>
            <br />
            <a className="flex" href="https://t.me/one_zero_eight">
              one-zero-eight 💜
            </a>
          </div>
        </aside>
      </div>
      <aside className="smw-mdh:flex hidden bg-background flex-col items-center py-4 px-8 h-[100dvh] sticky top-0">
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
        <br />
        <a href="https://t.me/one_zero_eight">one-zero-eight 💜</a>
      </aside>
    </>
  );
}

export default Sidebar;
