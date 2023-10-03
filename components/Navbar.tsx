import { SidebarMenuButton } from "@/components/Sidebar";
import SwitchThemeButton from "@/components/SwitchThemeButton";
import UserMenu from "@/components/UserMenu";

export function Navbar({
  children,
  className,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <nav
      className={`flex w-full items-start justify-between ${className ?? ""}`}
    >
      <SidebarMenuButton className="-ml-4 -mt-4 p-4 lgw-smh:hidden" />
      <div className="min-h-full flex-grow">{children}</div>
      <div className="hidden items-center gap-4 lgw-smh:flex">
        <SwitchThemeButton />
        <UserMenu isMobile={false} isSidebar={false} />
      </div>
    </nav>
  );
}

export function NavbarTemplate({
  title,
  description,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <Navbar>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-base text-text-secondary/75">{description}</p>
    </Navbar>
  );
}
