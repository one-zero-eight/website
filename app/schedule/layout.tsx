import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule",
  alternates: { canonical: "/schedule" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
