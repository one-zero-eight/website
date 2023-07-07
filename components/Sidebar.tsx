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
import UserMenu from "@/components/UserMenu";

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
  return (
    <>
      <div className="smw-mdh:hidden absolute flex flex-col">
        <div
          className={
            isOpened
              ? "block visible fixed inset-0 z-[2] bg-black/50"
              : "hidden invisible"
          }
          onClick={() => setOpened(false)}
        />
        <button
          className="pl-8 pt-8 flex visible z-[4] opacity-[0.999]"
          onClick={() => setOpened(!isOpened)}
        >
          <MenuIcon width={36} height={36} fill={`#FFFFFF`} />
        </button>
        <aside
          className={
            "flex-col fixed overflow-y-scroll justify-center items-center z-[3] opacity-[0.999] py-8 px-8 h-[100dvh] top-0 " +
            (isOpened ? "bg-background" : "hidden")
          }
        >
          <div
            className={
              isOpened
                ? "flex flex-col items-center left-0 opacity-100"
                : "flex relative left-[-500px] opacity-0"
            }
          >
            <Link href="/" className="flex mb-8">
              <Logo className="h-16" />
            </Link>
            <nav className="flex-col">
              {items.map((item) => (
                <div key={"m-" + item.title} onClick={() => setOpened(false)}>
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
            <div className="mb-4">
              <UserMenu isMobile={true} isSidebar={true} />
            </div>
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
        <div className="mb-4 lg:hidden lg:invisible">
          <UserMenu isMobile={false} isSidebar={true} />
        </div>
        <a href="https://t.me/one_zero_eight">one-zero-eight 💜</a>
      </aside>
    </>
  );
}

export default Sidebar;
