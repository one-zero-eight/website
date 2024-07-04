import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for anything at Innopolis University",
  alternates: { canonical: "/search" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
