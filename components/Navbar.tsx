import SwitchThemeButton from "@/components/SwitchThemeButton";
import UserMenu from "@/components/UserMenu";

type NavbarProps = {
  children?: React.ReactNode;
  className?: string;
};
export function Navbar({ children, className }: NavbarProps) {
  return (
    <nav
      className={
        "invisible z-[2] hidden items-start justify-between pb-0 opacity-[0.999] lgw-smh:visible lgw-smh:flex " +
        className
      }
    >
      <div className="mr-auto">{children}</div>
      <UserMenu isMobile={false} isSidebar={false} />
      <SwitchThemeButton />
    </nav>
  );
}
