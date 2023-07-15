"use client";
import DashboardIcon from "@/components/icons/DashboardIcon";
import { MenuIcon } from "@/components/icons/MenuIcon";
import ScholarshipIcon from "@/components/icons/ScholarshipIcon";
import UserMenu from "@/components/UserMenu";
import { useUsersGetMe } from "@/lib/events";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import Logo from "./icons/Logo";
import ScheduleIcon from "./icons/ScheduleIcon";
import SidebarSection from "./SidebarSection";

type Item = {
  title: string;
  path: string;
  icon: (props: { className?: string; fill?: string }) => React.JSX.Element;
};

const items: Item[] = [
  { title: "Dashboard", path: "/dashboard", icon: DashboardIcon },
  { title: "Schedule", path: "/schedule", icon: ScheduleIcon },
  // { title: "Laundry", path: "#", icon: LaundryIcon },
  // { title: "Forms", path: "#", icon: FormsIcon },
  // { title: "Canteen", path: "#", icon: CanteenIcon },
  { title: "Scholarship", path: "#", icon: ScholarshipIcon },
];

function Sidebar() {
  const { data: user } = useUsersGetMe();
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
          className="fixed ml-8 mt-8 flex visible z-[4] opacity-[0.999]"
          onClick={() => setOpened(!isOpened)}
        >
          <MenuIcon width={36} height={36} className="fill-text-main" />
        </button>
        <aside
          className={
            "flex-col fixed overflow-y-scroll justify-center items-center z-[3] opacity-[0.999] py-8 px-8 h-[100dvh] top-0 " +
            (isOpened ? "bg-primary-main" : "hidden")
          }
        >
          <div
            className={
              isOpened
                ? "flex flex-col items-center left-0 opacity-100"
                : "flex relative left-[-500px] opacity-0"
            }
          >
            <Link
              href={user ? "/dashboard" : "/schedule"}
              className="flex mb-8"
            >
              <Logo className="h-16 fill-text-main" />
            </Link>
            <nav className="flex-col">
              {items.map((item) => (
                <div
                  key={item.title}
                  onClick={() =>
                    item.path !== "#" ? setOpened(false) : undefined
                  }
                >
                  <SidebarSection
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
      <aside className="smw-mdh:flex hidden bg-primary-main flex-col items-center py-4 px-8 h-[100dvh] sticky top-0">
        <Link href={user ? "/dashboard" : "/schedule"} className="mb-8">
          <Logo className="h-16 fill-text-main" />
        </Link>
        <nav className="flex flex-col">
          {items.map((item) => (
            <SidebarSection
              key={item.title}
              title={item.title}
              icon={item.icon}
              selected={selection === item.title}
              path={item.path}
            />
          ))}
        </nav>
        <div className="grow"></div>
        <br />
        <div className="mb-4 lg:hidden lg:invisible">
          <UserMenu isMobile={false} isSidebar={true} />
        </div>
        <a className="text-text-main" href="https://t.me/one_zero_eight">
          one-zero-eight 💜
        </a>
      </aside>
    </>
  );
}

export default Sidebar;
