"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { csrfFetch } from "@/lib/csrf-client";
import type { Dictionary } from "@/lib/i18n";

export function GithubActions({
  dict,
  lang,
  connected,
  oauthAvailable,
}: {
  dict: Dictionary;
  lang: string;
  connected: boolean;
  oauthAvailable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/user/github", { method: "DELETE" });
      if (!res.ok) {
        setError(dict.studio.requestFailed);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    await signIn("github", { redirectTo: `/${lang}/settings` });
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {connected ? (
        <Button size="sm" variant="outline" onClick={disconnect} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {dict.settings.githubDisconnect}
        </Button>
      ) : oauthAvailable ? (
        <Button size="sm" onClick={connect} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {dict.settings.githubConnect}
        </Button>
      ) : (
        <p className="text-[11px] text-muted-foreground">{dict.settings.githubNotLinked}</p>
      )}
    </div>
  );
}
