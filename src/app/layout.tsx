import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import { ReaderRouteTransition } from "@/components/layout/ReaderRouteTransition";
import { PWARegistration } from "@/components/layout/PWARegistration";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "ZB Reader - 在线电子书阅读器",
  description: "一个简洁的在线电子书阅读器，支持 EPUB 格式",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "64x64" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZB Reader",
  },
};

export const viewport = {
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${lora.variable} ${inter.variable} antialiased font-sans`}
      >
        <PWARegistration />
        {children}
        <ReaderRouteTransition />
      </body>
    </html>
  );
}
