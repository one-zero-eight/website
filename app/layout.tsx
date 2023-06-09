import Sidebar from "@/components/Sidebar";
import { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://innohassle.ru"),
  title: { default: "InNoHassle", template: "%s — InNoHassle" },
  description: "InNoHassle ecosystem by one-zero-eight",
  applicationName: "InNoHassle",
  themeColor: "#000000",
  colorScheme: "dark",
  alternates: { canonical: "https://innohassle.ru" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background_dark font-primary text-white">
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div className="flex flex-row">
          <Sidebar />
          <main className="w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
