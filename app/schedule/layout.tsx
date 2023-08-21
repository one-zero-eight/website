import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "Schedule of classes and events at Innopolis University. " +
    "Find your group and see the calendar with all classes.",
  alternates: { canonical: "/schedule" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
