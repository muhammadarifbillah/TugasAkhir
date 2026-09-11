import { redirect } from "next/navigation";
import { ShieldCheck, Workflow } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";
import { auth, devProviderEnabled, githubConfigured, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { getDictionary } from "@/lib/i18n";

interface RegisterPageProps {
  params: Promise<{ lang: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (session?.user) redirect(`/${lang}/dashboard`);

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{dict.auth.registerTitle}</CardTitle>
          <CardDescription>{dict.auth.registerSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Register Form */}
          <RegisterForm lang={lang} />

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

          {/* Dev Account */}
          {devProviderEnabled && (
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
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardContent className="grid grid-cols-1 gap-2 text-center text-xs text-muted-foreground pt-6 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
            <ShieldCheck className="size-5 text-success" />
            {dict.auth.featEncryption}
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
            <Workflow className="size-5 text-primary" />
            {dict.auth.featEngine}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
