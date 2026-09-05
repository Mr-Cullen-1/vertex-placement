import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Vertex Placement",
  description: "Professional English placement testing for educational centers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Defense-in-depth only, not the fix itself — see
       * /docs/DESIGN_SYSTEM.md "No horizontal scrolling": every page/
       * table/list is responsible for fitting its own container; this
       * just guarantees a regression can never grow the whole document
       * wider than the viewport. */}
      <body className="min-h-full flex flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
