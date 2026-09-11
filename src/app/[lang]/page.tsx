import Link from "next/link";
import {
  GitBranch,
  KeyRound,
  Lock,
  MessageSquareText,
  ShieldCheck,
  ShieldHalf,
  Workflow,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";

interface HomePageProps {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  const features = [
    {
      icon: Workflow,
      title: dict.landing.featSdlcTitle,
      desc: dict.landing.featSdlcDesc,
    },
    {
      icon: ShieldHalf,
      title: dict.landing.featIsoTitle,
      desc: dict.landing.featIsoDesc,
    },
    {
      icon: KeyRound,
      title: dict.landing.featByokTitle,
      desc: dict.landing.featByokDesc,
    },
    {
      icon: GitBranch,
      title: dict.landing.featGithubTitle,
      desc: dict.landing.featGithubDesc,
    },
    {
      icon: MessageSquareText,
      title: dict.landing.featPromptTitle,
      desc: dict.landing.featPromptDesc,
    },
    {
      icon: Lock,
      title: dict.landing.featSecureTitle,
      desc: dict.landing.featSecureDesc,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
      <section className="text-center">
        <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border bg-success/10 px-4 py-1.5 text-xs font-medium text-success">
          <ShieldCheck className="size-3.5" />
          {dict.landing.badge}
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          {dict.landing.hero1}
          <br />
          <span className="text-primary">{dict.landing.hero2}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {dict.app.name} {dict.landing.intro}
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          {session?.user ? (
            <Button asChild size="lg">
              <Link href={`/${lang}/dashboard`}>{dict.nav.dashboard}</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href={`/${lang}/login`}>{dict.auth.signInWithGithub}</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <f.icon className="size-6 text-primary" />
              <CardTitle className="text-base">{f.title}</CardTitle>
              <CardDescription>{f.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}