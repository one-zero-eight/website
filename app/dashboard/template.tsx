import { NavbarTemplate } from "@/components/layout/Navbar";

export default function Template({ children }: React.PropsWithChildren) {
  return (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <NavbarTemplate
        title="Dashboard"
        description="Your cozy space on this planet."
      />
      {children}
    </div>
  );
}
