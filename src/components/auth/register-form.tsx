"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { csrfFetch } from "@/lib/csrf-client";
import type { Dictionary } from "@/lib/i18n";

interface RegisterFormProps {
  lang: string;
  dict: Dictionary;
}

export function RegisterForm({ lang, dict }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setErrorMsg(dict.auth.passwordsDoNotMatch);
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMsg(dict.auth.passwordTooShort);
      setLoading(false);
      return;
    }

    try {
      const res = await csrfFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || dict.auth.registerFailed);
        return;
      }

      setSuccessMsg(dict.auth.registerSuccess);
      // Redirect after a short pause so the success message is readable.
      window.setTimeout(() => {
        router.push(`/${lang}/login`);
      }, 1500);
    } catch {
      setErrorMsg(dict.auth.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">{dict.auth.nameLabel}</Label>
        <Input
          id="name"
          type="text"
          placeholder={dict.auth.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>
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
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{dict.auth.confirmPasswordLabel}</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder={dict.auth.confirmPasswordPlaceholder}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
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

      {successMsg && (
        <p
          role="status"
          className="rounded-md border border-success/50 bg-success/10 px-3 py-2 text-center text-xs text-success"
        >
          {successMsg}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus className="size-4" aria-hidden="true" />
        )}
        {dict.auth.createAccountButton}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.haveAccount}{" "}
        <Link href={`/${lang}/login`} className="text-primary hover:underline">
          {dict.auth.signInLink}
        </Link>
      </p>
    </form>
  );
}
