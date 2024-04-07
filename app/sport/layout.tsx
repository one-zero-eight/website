import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sport",
  description: "Sport for Innopolis University students.",
  alternates: { canonical: "/sport" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
