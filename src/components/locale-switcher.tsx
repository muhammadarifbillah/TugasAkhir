"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = {
  en: "English",
  id: "Indonesia",
};

/**
 * Two-way language switch. Rendered as plain buttons so it needs no dictionary
 * data and no Radix Select — which is what previously crashed the mobile menu
 * when it was handed a partial dictionary object.
 */
export function LocaleSwitcher({
  currentLocale,
  label,
  className,
}: {
  currentLocale: Locale;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = useCallback(
    (next: Locale) => {
      if (next === currentLocale) return;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      if (pathname) {
        const segments = pathname.split("/");
        segments[1] = next;
        router.replace(segments.join("/"));
      }
      router.refresh();
    },
    [currentLocale, pathname, router],
  );

  const options = useMemo(() => locales, []);

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-md border p-0.5", className)}
    >
      {options.map((loc) => {
        const active = loc === currentLocale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc)}
            aria-current={active ? "true" : undefined}
            title={LABELS[loc]}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {loc.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
