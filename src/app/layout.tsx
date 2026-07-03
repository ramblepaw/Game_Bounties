import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { CHECKLIST_FONT_VARIABLE_CLASSNAMES } from "@/lib/fonts";
import { cn } from "@/lib/cn";
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
  title: "Game Bounties",
  description: "Completion checklists for video games",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      className={cn(
        geistSans.variable,
        geistMono.variable,
        CHECKLIST_FONT_VARIABLE_CLASSNAMES,
        "h-full antialiased",
        theme === "dark" && "dark",
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
