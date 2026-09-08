import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  metadataBase: new URL("https://disfrutonas.com"),

  title: {
    default: "Disfrutonas | Eventos, conciertos y planes en España",
    template: "%s | Disfrutonas",
  },

  description:
    "Descubre conciertos, festivales, eventos y planes en España. Encuentra qué hacer, dónde y cuándo con Disfrutonas.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://disfrutonas.com",
    siteName: "Disfrutonas",
    title: "Disfrutonas | Eventos, conciertos y planes en España",
    description:
      "Descubre conciertos, festivales, eventos y planes en España.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Disfrutonas | Eventos, conciertos y planes en España",
    description:
      "Descubre conciertos, festivales, eventos y planes en España.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PVBBCSYZWJ"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PVBBCSYZWJ');
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}