"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n";

interface LoginFormProps {
  lang: string;
  dict: Dictionary;
  callbackUrl?: string;
  error?: string;
}

export function LoginForm({ lang, dict, callbackUrl, error }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    error === "CredentialsSignin" ? dict.auth.invalidCredentials : "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl ?? `/${lang}/dashboard`,
      });

      if (result?.error) {
        setErrorMsg(dict.auth.invalidCredentials);
        return;
      }
      if (result?.url) {
        router.push(result.url);
        router.refresh();
      }
    } catch {
      // Without this the rejection is unhandled and the submit button stays
      // disabled for the rest of the session.
      setErrorMsg(dict.studio.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">{dict.auth.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          placeholder={dict.auth.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{dict.auth.passwordLabel}</Label>
        <Input
          id="password"
          type="password"
          placeholder={dict.auth.passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="current-password"
        />
      </div>

      {errorMsg && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
        >
          {errorMsg}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="size-4" aria-hidden="true" />
        )}
        {dict.auth.signInWithEmail}
      </Button>
    </form>
  );
}
