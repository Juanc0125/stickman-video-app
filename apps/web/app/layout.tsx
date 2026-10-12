import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorker from "./components/service-worker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stickman",
  description: "Genera, revisa, aprueba y publica videos cortos de marketing hipotecario.",
  applicationName: "Stickman",
  appleWebApp: { capable: true, title: "Stickman", statusBarStyle: "black-translucent" },
  icons: {
    // The SVG first: crisp at every size in browsers that take it; the PNGs
    // are for the rest and for installed-app surfaces.
    icon: [
      { url: "/icons/logo-mark.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink-950 font-sans text-slate-100">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
