import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Sans } from "next/font/google";
import { routing, direction, type Locale } from "@/i18n/routing";
import { DemoBanner } from "@/components/ui/demo-banner";
import "../globals.css";

/**
 * IBM Plex Sans Arabic — primary Arabic typeface for Btkr Valley.
 *
 * Chosen for DGA-style alignment: open-licensed, broad weight range,
 * and high legibility for Arabic government UI. Bound to `--font-plex-arabic`.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

/**
 * IBM Plex Sans — Latin companion for English locale and numerals.
 */
const plexLatin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

const APP_NAME_AR = "وادي بتكر";

export const metadata: Metadata = {
  applicationName: APP_NAME_AR,
  title: { default: APP_NAME_AR, template: `%s · ${APP_NAME_AR}` },
  description:
    "منصة إدارة الابتكار للأكاديمية. Innovation management for KSAA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME_AR },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Light-only platform — no dark theme.
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Root layout — locale-aware. Sets `<html lang>` and `<html dir>` from the
 * route segment, mounts the font variables, and wraps the tree with the
 * next-intl client provider so client components can call `useTranslations`.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = direction(locale as Locale);
  const fontClass = locale === "ar" ? plexArabic.className : plexLatin.className;

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${plexArabic.variable} ${plexLatin.variable}`}
    >
      <body
        className={`${fontClass} min-h-dvh bg-white text-neutral-900 antialiased`}
      >
        <DemoBanner />
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
