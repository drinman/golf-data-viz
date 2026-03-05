import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GA4Bootstrap } from "@/lib/analytics/ga4-bootstrap";
import { GA4PageView } from "@/lib/analytics/ga4-pageview";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://golfdataviz.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Golf Data Viz",
    template: "%s | Golf Data Viz",
  },
  description:
    "Free post-round golf benchmark from manual scorecard stats. Compare yourself to handicap peers, not Tour pros.",
  openGraph: {
    type: "website",
    siteName: "Golf Data Viz",
    title: "Golf Data Viz",
    description:
      "Free post-round golf benchmark from manual scorecard stats. Compare yourself to handicap peers, not Tour pros.",
    images: [
      {
        url: "/strokes-gained/og",
        width: 1200,
        height: 630,
        alt: "Golf Data Viz Strokes Gained Benchmarker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Golf Data Viz",
    description:
      "Free post-round golf benchmark from manual scorecard stats. Compare yourself to handicap peers, not Tour pros.",
    images: ["/strokes-gained/og"],
  },
};

const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSerifDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
        {ga4Id && (
          <>
            <GA4Bootstrap measurementId={ga4Id} />
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
          </>
        )}
        <GA4PageView />
      </body>
    </html>
  );
}
