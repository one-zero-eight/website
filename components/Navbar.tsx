import UserMenu from "@/components/UserMenu";

export function Navbar({ children, ...props }: any) {
  return (
    <nav className="hidden lg:flex justify-between bg-background_dark items-center">
      {children}
      <UserMenu />
    </nav>
  );
}
