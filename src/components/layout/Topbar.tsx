import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import { SidebarMenuButton } from "@/components/layout/Sidebar";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";

export function Topbar({ title }: { title: React.ReactNode }) {
  return (
    <nav className="flex w-full flex-row items-center justify-between border-b-[1px] border-b-secondary-hover">
      <SidebarMenuButton className="flex h-fit py-4 pl-4 lgw-smh:hidden" />
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
