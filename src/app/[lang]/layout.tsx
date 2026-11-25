import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { Header } from "@/components/header";
import { MotionProvider } from "@/components/motion-provider";
import { SiteFooter } from "@/components/site-footer";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import "../globals.css";

// Self-hosted Archivo (latin subset, weight 100-900 + width 62-125%) so the app
// does not depend on Google Fonts at build/runtime and works fully offline.
const archivoSans = localFont({
  src: "../fonts/Archivo.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
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
    title: "Saksi — AI code ships only with a witness",
    description:
      "An AI website studio with five server-enforced gates. Every gate is mapped to ISO/IEC 27001:2022, with NIST SP 800-218 as a supplement.",
  },
  id: {
    title: "Saksi — Kode AI lolos hanya bila ada saksinya",
    description:
      "Studio website berbasis AI dengan lima gerbang yang dijaga server. Setiap gerbang dipetakan ke ISO/IEC 27001:2022, dengan NIST SP 800-218 sebagai pelengkap.",
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
  // Set by src/proxy.ts; next-themes' inline anti-flash script needs it to pass the CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang={lang}
      dir="ltr"
      suppressHydrationWarning
      className={`${archivoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
        >
          {dict.a11y.skipToContent}
        </a>
        <PwaRegister />
        <ThemeProvider nonce={nonce}>
          <MotionProvider>
            <div className="flex h-svh flex-col overflow-hidden">
              <OfflineBanner label={dict.app.offline} />
              <Header lang={lang} />
              {/* relative keeps sr-only text from scrolling the window; #main-content is Lenis' content. */}
              <main id="main" className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div id="main-content" className="flex shrink-0 grow flex-col">
                  {children}
                  <SiteFooter
                    label={`${dict.app.name} — ${dict.app.tagline} ${dict.app.frameworkNote}`}
                  />
                </div>
              </main>
            </div>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
