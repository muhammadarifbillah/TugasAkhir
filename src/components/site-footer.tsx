"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FuseLockup } from "@/components/brand/fuse-lockup";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { defaultLocale, isLocale } from "@/lib/i18n";

// The root layout only passes name and label, so the language comes from the path (same as not-found.tsx).
const FOOTER = { en: en.footer, id: id.footer };

/**
 * Global footer. Hidden inside the studio workspace, where vertical space is
 * precious and the page is already a full-height tool surface.
 */
export function SiteFooter({ name, label }: { name: string; label: string }) {
  const pathname = usePathname();
  if (pathname?.includes("/studio/")) return null;
  const segment = pathname?.split("/")[1] ?? "";
  const lang = isLocale(segment) ? segment : defaultLocale;
  return (
    <footer className="mt-auto border-t px-4 py-6 text-center text-xs text-muted-foreground">
      <FuseLockup label={name} className="mx-auto mb-2 h-5 w-auto text-foreground" />
      {label}
      <p className="mt-1">
        <Link
          href={`/${lang}/credits`}
          className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {FOOTER[lang].credits}
        </Link>
      </p>
    </footer>
  );
}
