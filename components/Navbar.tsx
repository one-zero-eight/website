import UserMenu from "@/components/UserMenu";

export function Navbar({ children }: any) {
  return (
    <nav className="hidden lg:flex justify-between z-[2] opacity-[0.999] pb-0 items-start">
      <div className="mr-auto">{children}</div>
      <UserMenu isMobile={false} isSidebar={false} />
    </nav>
  );
}
