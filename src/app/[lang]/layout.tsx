import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import "../globals.css";

// Self-hosted Geist (latin subset) so the app does not depend on Google Fonts
// at build/runtime and works fully offline.
const geistSans = localFont({
  src: "../fonts/Geist.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const geistMono = localFont({
  src: "../fonts/GeistMono.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

/**
 * This layout is the application's ROOT layout: `src/app/layout.tsx` was
 * removed so that `<html lang>` and `<html dir>` can be derived from the
 * `[lang]` route parameter on the server. Setting them client-side caused a
 * flash of the wrong direction and shipped an incorrect `lang` to assistive
 * technology. `lang` is a "root parameter" here, so any Server Component can
 * read it.
 */
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const META: Record<string, { title: string; description: string }> = {
  en: {
    title: "ShieldForge — AI-Powered Secure Website Generator",
    description:
      "Generate secure websites with an AI-guided 5-stage Secure SDLC, grounded in NIST SP 800-218 and ISO 27001:2022.",
  },
  id: {
    title: "ShieldForge — Generator Website Aman Bertenaga AI",
    description:
      "Hasilkan website aman dengan Secure SDLC 5 tahap berbasis AI, berlandaskan NIST SP 800-218 dan ISO 27001:2022.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const meta = META[lang] ?? META.en;
  return {
    ...meta,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function RootLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
        >
          {dict.a11y.skipToContent}
        </a>
        <PwaRegister />
        <ThemeProvider>
          <div className="flex h-svh flex-col overflow-hidden">
            <OfflineBanner label={dict.app.offline} />
            <Header lang={lang} />
            <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
            <SiteFooter
              label={`${dict.app.name} — ${dict.app.tagline}. ${dict.app.frameworkNote}`}
            />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
