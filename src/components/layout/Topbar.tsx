import { useMe } from "@/api/accounts/user.ts";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import { cn } from "@/lib/ui/cn";

export function Topbar({
  title,
  hideOnMobile = false,
  hideBorder = false,
}: {
  title: string;
  hideOnMobile?: boolean;
  hideBorder?: boolean;
}) {
  const { me } = useMe();

  return (
    <nav
      className={cn(
        "w-full flex-row items-center justify-between",
        /* Show top bar on mobile if not authenticated */
        hideOnMobile && !!me ? "hidden lg:flex" : "flex",
        hideBorder && !!me ? "" : "border-b-base-300 border-b",
      )}
    >
      <div className="grow px-4 py-2">
        <h1 className="mr-2 text-3xl font-medium">{title}</h1>
      </div>
      <div className="hidden items-center py-2 pr-4 lg:flex">
        {/* <ToggleSnowButton /> // Disable snow */}
        <SwitchThemeButton />
        <UserMenu isMobile={false} isSidebar={false} />
      </div>
      {/* Show "Sign in" button on mobile if not authenticated */}
      {!me && (
        <div className="flex shrink-0 items-center py-2 pr-4 lg:hidden">
          <UserMenu isMobile={false} isSidebar={false} />
        </div>
      )}
    </nav>
  );
}
