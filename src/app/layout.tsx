import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import {
  Cormorant_Garamond,
  EB_Garamond,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibrazioni Letterarie — La tua biblioteca personale",
  description:
    "La tua biblioteca digitale personale. Scaffali virtuali, statistiche di lettura, profilo lettore AI.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vibrazioni",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0b08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${cormorant.variable} ${garamond.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="bg-void text-text-warm antialiased grain">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
