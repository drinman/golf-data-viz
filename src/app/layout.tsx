import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://golfdataviz.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Golf Data Viz",
    template: "%s | Golf Data Viz",
  },
  description: "Golf performance analysis for mid-handicap golfers.",
  openGraph: {
    type: "website",
    siteName: "Golf Data Viz",
    title: "Golf Data Viz",
    description: "Golf performance analysis for mid-handicap golfers.",
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
    description: "Golf performance analysis for mid-handicap golfers.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SiteHeader />
        {children}
        <Analytics />
        {ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}', { send_page_view: false });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
