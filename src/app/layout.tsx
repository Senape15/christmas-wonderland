import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  applicationName: "Christmas Wonderland",
  title: {
    default: "Christmas Wonderland",
    template: "%s · Christmas Wonderland",
  },
  description:
    "Un calendario dell'Avvento interattivo in un villaggio di Natale da esplorare: caselle, indizi, quiz e ricordi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Wonderland",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b2e1a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
