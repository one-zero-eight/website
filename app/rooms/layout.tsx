import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dorm rooms",
  description: "Split duties in your dormitory room.",
  alternates: { canonical: "/rooms" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
