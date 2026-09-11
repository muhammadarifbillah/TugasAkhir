import { redirect } from "next/navigation";
import Link from "next/link";
import { KeyRound, ShieldCheck, Workflow } from "lucide-react";
import { auth, devProviderEnabled, githubConfigured, isAuthMisconfigured, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GithubIcon } from "@/components/ui/github-icon";
import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/lib/i18n";

interface LoginPageProps {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : undefined;

  if (session?.user) redirect(`/${lang}/dashboard`);

  const showDev = devProviderEnabled;

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{dict.auth.signInTitle}</CardTitle>
          <CardDescription>{dict.auth.signInSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Email/Password Form */}
          <LoginForm lang={lang} error={error} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* GitHub OAuth */}
          {githubConfigured && (
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: `/${lang}/dashboard` });
              }}
            >
              <Button type="submit" variant="outline" className="w-full" size="lg">
                <GithubIcon className="size-5" />
                {dict.auth.signInWithGithub}
              </Button>
            </form>
          )}

          {/* Dev Account — never available in production */}
          {showDev && (
            <form
              action={async () => {
                "use server";
                await signIn("dev", { redirectTo: `/${lang}/dashboard` });
              }}
            >
              <Button type="submit" variant="ghost" className="w-full" size="lg">
                {dict.auth.signInWithDev}
              </Button>
            </form>
          )}

          {showDev && (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
              {dict.auth.devModeNote}
            </p>
          )}

          {isAuthMisconfigured && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
              Production sign-in is unavailable: set AUTH_GITHUB_ID and
              AUTH_GITHUB_SECRET, or the app has no authentication provider.
            </p>
          )}

          {error && error !== "CredentialsSignin" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
              {error === "AccessDenied"
                ? dict.auth.errorAccessDenied
                : error === "OAuthSignin" || error === "OAuthCallback" || error === "OAuthCreateAccount"
                  ? dict.auth.errorOAuth
                  : dict.auth.errorDefault}
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {dict.auth.noAccount}{" "}
            <Link href={`/${lang}/register`} className="text-primary hover:underline">
              {dict.auth.createAccount}
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-primary" />
            {dict.auth.byokTitle}
          </CardTitle>
          <CardDescription>{dict.auth.byokSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-center text-xs text-muted-foreground sm:grid-cols-3">
          <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
            <ShieldCheck className="size-5 text-success" />
            {dict.auth.featEncryption}
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
            <Workflow className="size-5 text-primary" />
            {dict.auth.featEngine}
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
            <GithubIcon className="size-5" />
            {dict.auth.featPush}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}