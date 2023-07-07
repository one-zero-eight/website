import Providers from "@/app/providers";
import Sidebar from "@/components/Sidebar";
import GoogleAnalytics from "@/lib/tracking/GoogleAnalytics";
import YandexMetrika from "@/lib/tracking/YandexMetrika";
import { Metadata } from "next";
import { Rubik } from "next/font/google";
import React from "react";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://innohassle.ru"),
  title: { default: "InNoHassle", template: "%s — InNoHassle" },
  description: "InNoHassle ecosystem by one-zero-eight",
  applicationName: "InNoHassle",
  themeColor: "#000000",
  colorScheme: "dark",
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${rubik.variable}`}>
      <body className="bg-base font-primary text-text text-lg">
        <Providers>
          <noscript className="flex justify-center w-full p-8 bg-red-700">
            You need to enable JavaScript to run this app.
          </noscript>
          <YandexMetrika />
          <GoogleAnalytics />

          <div className="flex flex-row">
            <Sidebar />
            <main className="w-full">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
