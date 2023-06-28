import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  alternates: { canonical: "/dashboard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
