import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    title: "SecureSDLC — AI-Powered Secure Website Generator",
    description:
      "Generate secure websites with an AI-guided 5-stage Secure SDLC, grounded in NIST SP 800-218 and ISO 27001:2022.",
  },
  id: {
    title: "SecureSDLC — Generator Website Aman Bertenaga AI",
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
        <ThemeProvider>
          <div className="flex min-h-svh flex-col">
            <Header lang={lang} />
            <main className="flex-1">{children}</main>
            <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
              {dict.app.name} — {dict.app.tagline}. {dict.app.frameworkNote}
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
