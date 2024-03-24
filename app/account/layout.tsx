import { NavbarTemplate } from "@/components/layout/Navbar";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <NavbarTemplate
        title="My account"
        description="Manage your InNoHassle Account and services."
      />
      {children}
    </div>
  );
}
