"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { defaultLocale, isLocale } from "@/lib/i18n";

const DICTIONARIES = { en, id };

export default function LangNotFound() {
  const pathname = usePathname();
  const segment = pathname?.split("/")[1] ?? "";
  const lang = isLocale(segment) ? segment : defaultLocale;
  const dict = DICTIONARIES[lang];

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold">{dict.errors.notFoundTitle}</h1>
      <p className="text-sm text-muted-foreground">{dict.errors.notFoundDescription}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href={`/${lang}`}>{dict.errors.backHome}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${lang}/dashboard`}>{dict.errors.backToDashboard}</Link>
        </Button>
      </div>
    </div>
  );
}
