import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import clsx from "clsx";

export function Topbar({
  title,
  hideOnMobile = false,
}: {
  title: string;
  hideOnMobile?: boolean;
}) {
  return (
    <nav
      className={clsx(
        "w-full flex-row items-center justify-between border-b-[1px] border-b-secondary-hover",
        hideOnMobile ? "hidden lgw-smh:flex" : "flex",
      )}
    >
      <div className="flex-grow px-4 py-2">
        <h1 className="mr-2 text-3xl font-medium">{title}</h1>
      </div>
      <div className="hidden items-center py-2 pr-4 lgw-smh:flex">
        <SwitchThemeButton />
        <LeaveFeedbackButton />
        <UserMenu isMobile={false} isSidebar={false} />
      </div>
    </nav>
  );
}
