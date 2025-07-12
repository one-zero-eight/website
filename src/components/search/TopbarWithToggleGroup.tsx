import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import ToggleGroup from "./ToggleGroup";
import clsx from "clsx";

export function TopbarWithToggleGroup({
  hideOnMobile = false,
  currentTabText,
}: {
  hideOnMobile?: boolean;
  currentTabText: string;
}) {
  return (
    <nav
      className={clsx(
        "w-full flex-row items-center justify-between border-b-[1px] border-b-secondary-hover",
        hideOnMobile ? "hidden lg:flex" : "flex",
      )}
    >
      <div className="flex-grow justify-center px-4 md:justify-between">
        <ToggleGroup currentTabText={currentTabText}></ToggleGroup>
      </div>
      <div className="hidden items-center py-2 pr-4 lg:flex">
        <SwitchThemeButton />
        <LeaveFeedbackButton />
        <UserMenu isMobile={false} isSidebar={false} />
      </div>
    </nav>
  );
}
