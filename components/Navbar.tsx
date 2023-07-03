import UserMenu from "@/components/UserMenu";

export function Navbar({ children }: any) {
  return (
    <nav className="hidden lg:flex justify-between z-10 opacity-[0.999] pb-0 bg-background_dark items-start">
      <div className="mr-auto">{children}</div>
      <UserMenu isMobile={false} isSidebar={false} />
    </nav>
  );
}
