import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import clsx from "clsx";
import ToggleSnowButton from "./ToggleSnowButton";

export function Topbar({
  title,
  hideOnMobile = false,
  hideBorder = false,
}: {
  title: string;
  hideOnMobile?: boolean;
  hideBorder?: boolean;
}) {
  return (
    <nav
      className={clsx(
        "w-full flex-row items-center justify-between",
        hideOnMobile ? "hidden lg:flex" : "flex",
        hideBorder ? "" : "border-b-base-300 border-b",
      )}
    >
      <div className="grow px-4 py-2">
        <h1 className="mr-2 text-3xl font-medium">{title}</h1>
      </div>
      <div className="hidden items-center py-2 pr-4 lg:flex">
        <ToggleSnowButton />
        <SwitchThemeButton />
        <UserMenu isMobile={false} isSidebar={false} />
      </div>
    </nav>
  );
}
