import { NavbarTemplate } from "@/components/layout/Navbar";

export default function Template({ children }: React.PropsWithChildren) {
  return (
    <div className="@container/content flex flex-col p-4 @2xl/main:p-12">
      <NavbarTemplate
        title="Dashboard"
        description="Your cozy space on this planet."
      />
      {children}
    </div>
  );
}
