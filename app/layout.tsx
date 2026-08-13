import type { Metadata } from "next";
import { Sora, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import { SiteShell } from "@/components/layout/SiteShell";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.terminboerse.at"),
  title: "Arzttermin Wien, freie Slots & Apotheken | Terminbörse.at",
  description:
    "Finde kurzfristige Arzttermine in Wien, prüfe freie 3-Tage-Slots und suche Apotheken nach Bezirk. Für Ärztinnen und Ärzte: Profil verwalten und freie Zeiten sichtbar machen.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "Arzttermin Wien",
    "kurzfristiger Arzttermin",
    "freie Arzttermine Wien",
    "Apotheken Wien",
    "Arztbereich Wien",
    "freie 3-Tage-Slots",
    "Facharzt Wien",
    "Zahnarzt Wien",
    "Orthopädie Wien",
    "Terminbörse",
  ],
  openGraph: {
    title: "Arzttermin Wien, freie Slots & Apotheken | Terminbörse.at",
    description:
      "Finde kurzfristige Arzttermine in Wien, prüfe freie 3-Tage-Slots und suche Apotheken nach Bezirk.",
    url: "https://www.terminboerse.at",
    siteName: "Terminbörse.at",
    locale: "de_AT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arzttermin Wien, freie Slots & Apotheken | Terminbörse.at",
    description:
      "Finde kurzfristige Arzttermine in Wien, prüfe freie 3-Tage-Slots und suche Apotheken nach Bezirk.",
  },
  verification: {
    google: "vrWQo-G7ko2w-_8-4LOGewb4h2e7890ZeETG8HaGYzw",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${sourceSans.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteShell>{children}</SiteShell>
      </body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-X6917K5GWS"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', 'G-X6917K5GWS');
        `}
      </Script>
    </html>
  );
}
