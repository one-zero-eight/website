import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browser extension",
  description:
    "Convenient tools for Moodle, InNoHassle and other services at Innopolis University.",
  alternates: { canonical: "/extension" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
