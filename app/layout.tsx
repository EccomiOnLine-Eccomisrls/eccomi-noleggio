import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import EccomiTerminology from "./eccomi-terminology";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ECCOMI NOLEGGIO",
  description: "Pannello operativo per promozioni, lead, partner e commissioni ECCOMI NOLEGGIO.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EccomiTerminology />
        {children}
      </body>
    </html>
  );
}
