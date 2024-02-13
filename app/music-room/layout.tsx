import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music room",
  description: "Book the Music room in Innopolis.",
  alternates: { canonical: "/music-room" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
