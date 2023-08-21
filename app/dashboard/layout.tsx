import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard with your schedule",
  description: "Sign in and see your schedule at Innopolis University.",
  alternates: { canonical: "/dashboard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
