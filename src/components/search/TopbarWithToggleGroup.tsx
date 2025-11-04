import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import clsx from "clsx";
import ToggleGroup from "./ToggleGroup";

export function TopbarWithToggleGroup({
  hideOnMobile = false,
  currentTabText,
}: {
  hideOnMobile?: boolean;
  currentTabText: string | undefined;
}) {
  return (
    <nav
      className={clsx(
        "border-b-inh-secondary-hover w-full flex-row items-center justify-between border-b",
        hideOnMobile ? "hidden lg:flex" : "flex",
      )}
    >
      <div className="grow justify-center px-4 md:justify-between">
        <ToggleGroup currentTabText={currentTabText}></ToggleGroup>
      </div>
      <div className="hidden items-center py-2 pr-4 lg:flex">
        <SwitchThemeButton />
        <UserMenu isMobile={false} isSidebar={false} />
      </div>
    </nav>
  );
}
