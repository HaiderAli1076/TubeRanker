import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";
import "./globals.css";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TubeRank",
  description: "Advanced YouTube Analytics and SEO Platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{metadata.title as string}</title>
        <meta name="description" content={metadata.description as string} />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        {/* Desktop Top Navigation */}
        <TopNav />
        {/* Main content wrapper */}
        <div className="min-h-screen flex flex-col">
          <Providers>{children}</Providers>
        </div>
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </body>
    </html>
  );
}
