"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { defaultLocale, isLocale } from "@/lib/i18n";

const DICTIONARIES = { en, id };

export default function LangError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang && isLocale(params.lang) ? params.lang : defaultLocale;
  const dict = DICTIONARIES[lang];

  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">{dict.errors.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">{dict.errors.description}</p>
          {error.digest && (
            <p className="font-mono text-[11px] text-muted-foreground">ref: {error.digest}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={reset}>
              {dict.errors.tryAgain}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${lang}/dashboard`}>{dict.errors.backToDashboard}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
