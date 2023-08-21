import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarship",
  description:
    "Calculate your scholarship at Innopolis University. " +
    "Type your marks for the previous semester to see the expected scholarship.",
  alternates: { canonical: "/scholarship" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
