import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

/**
 * Supported UI languages. The app ships two fully translated dictionaries —
 * English (source of truth) and Indonesian. Adding a language requires a new
 * JSON file in `src/dictionaries` that is a complete superset of `en.json`,
 * because `Dictionary` below is inferred from the English file and every other
 * locale must be assignable to it.
 */
export const locales = ["en", "id"] as const;

export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export type Dictionary = typeof import("@/dictionaries/en.json");

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  id: () => import("@/dictionaries/id.json").then((m) => m.default),
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  const headers = { "accept-language": acceptLanguage ?? "*" };
  const languages = new Negotiator({ headers }).languages();
  try {
    return match(languages, [...locales], defaultLocale) as Locale;
  } catch {
    return defaultLocale;
  }
}

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function getLocaleFromCookie(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null;
  const found = /(?:^|;\s*)NEXT_LOCALE=([A-Za-z-]{2,5})/.exec(cookieHeader);
  if (!found) return null;
  return isLocale(found[1]) ? found[1] : null;
}

/**
 * Resolves the dictionary for a locale string. Unknown locales fall back to
 * English rather than throwing, so a stale `NEXT_LOCALE` cookie can never break
 * a render.
 */
export function getDictionary(locale: string): Promise<Dictionary> {
  return dictionaries[isLocale(locale) ? locale : defaultLocale]();
}
