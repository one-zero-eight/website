import SwitchThemeButton from "@/components/SwitchThemeButton";
import UserMenu from "@/components/UserMenu";

type NavbarProps = {
  children: React.ReactNode;
  className?: string;
};
export function Navbar({ children, className }: NavbarProps) {
  return (
    <nav
      className={
        "hidden invisible lgw-smh:flex lgw-smh:visible justify-between z-[2] opacity-[0.999] pb-0 items-start " +
        className
      }
    >
      <div className="mr-auto">{children}</div>
      <UserMenu isMobile={false} isSidebar={false} />
      <SwitchThemeButton />
    </nav>
  );
}
