import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TranslationsProvider } from "@/components/providers/translations-provider";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME ?? "BRICK ERP PWA",
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME ?? "BRICK ERP PWA"}`,
  },
  description: "Production-ready Next.js PWA baseline with minimal service worker.",
  applicationName: process.env.NEXT_PUBLIC_APP_NAME ?? "BRICK ERP PWA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: process.env.NEXT_PUBLIC_APP_NAME ?? "BRICK ERP PWA",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    title: process.env.NEXT_PUBLIC_APP_NAME ?? "BRICK ERP PWA",
    description: "Production-ready Next.js PWA baseline with minimal service worker.",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    siteName: process.env.NEXT_PUBLIC_APP_NAME ?? "BRICK ERP PWA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TranslationsProvider>{children}</TranslationsProvider>
      </body>
    </html>
  );
}
