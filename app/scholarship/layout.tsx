import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarship",
  alternates: { canonical: "/scholarship" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
