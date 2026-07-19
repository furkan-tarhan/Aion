import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { AuthProvider } from "@/lib/auth";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "layout" });

  const title = t("defaultTitle");
  const description = t("defaultDescription");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`
    },
    description,
    openGraph: {
      siteName: SITE_NAME,
      title,
      description,
      url: SITE_URL,
      locale: locale === "tr" ? "tr_TR" : "en_US",
      type: "website",
      images: [{ url: "/logo.png", width: 512, height: 512, alt: SITE_NAME }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo.png"]
    }
  };
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
