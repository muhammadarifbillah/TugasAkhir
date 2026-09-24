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
      <section className="relative isolate text-center">
        <div
          className="motif-dots pointer-events-none absolute inset-x-0 -top-12 -z-10 h-80 opacity-70"
          aria-hidden="true"
        />
        <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border bg-success/10 px-4 py-1.5 text-xs font-medium text-success shadow-sm">
          <ShieldCheck className="size-3.5" />
          {dict.landing.badge}
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
          {dict.landing.hero1}
          <br />
          <span className="text-gradient">{dict.landing.hero2}</span>
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

      <section className="mt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{dict.landing.howTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{dict.landing.howSubtitle}</p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {dict.landing.steps.map((step, i) => (
            <li key={step.title} className="card-elevated relative rounded-xl border bg-card p-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <p className="mt-3 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {dict.landing.stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-card/60 px-4 py-3 text-center">
              <p className="text-gradient text-lg font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="transition-transform duration-200 hover:-translate-y-0.5">
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