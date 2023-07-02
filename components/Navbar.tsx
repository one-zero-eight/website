import UserMenu from "@/components/UserMenu";

export function Navbar({ children, ...props }: any) {
  return (
    <nav className="hidden lg:flex justify-between pb-0 bg-background_dark items-start">
      <div className="mr-auto">{children}</div>
      <UserMenu />
    </nav>
  );
}
