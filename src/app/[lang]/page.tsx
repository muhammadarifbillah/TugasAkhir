import Link from "next/link";
import {
  GitBranch,
  KeyRound,
  Lock,
  MessageSquareText,
  ShieldHalf,
  Workflow,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";

/**
 * SSDF task -> ISO 27001 Annex A crosswalk for each stage, copied from
 * prisma/seed.ts (a stage may satisfy more than one control).
 */
const STAGE_CODES = [
  { nist: "PO.1.1", iso: "A.5.1, A.5.8" },
  { nist: "PW.1.1", iso: "A.8.26, A.8.27" },
  { nist: "PW.5.1", iso: "A.8.28" },
  { nist: "PW.8.1", iso: "A.8.29" },
  { nist: "PS.3.1", iso: "A.8.13, A.8.10" },
] as const;

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

  const steps = dict.landing.steps;
  const runningStage = 2; // 0-based index of the stage shown as in progress
  const statusFor = (i: number) =>
    i < runningStage
      ? dict.landing.statusPass
      : i === runningStage
        ? dict.landing.statusRunning
        : dict.landing.statusWaiting;
  // Status colours stay semantic: the stage ramp must never read as a warning.
  const statusColor = (i: number) =>
    i < runningStage
      ? "var(--success)"
      : i === runningStage
        ? "var(--primary)"
        : "var(--muted-foreground)";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 md:py-20">
      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h1 className="display-type text-balance text-4xl md:text-5xl">{dict.landing.headline}</h1>
          <p className="mt-6 max-w-[38ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            {dict.landing.lede}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={session?.user ? `/${lang}/dashboard` : `/${lang}/login`}>
                {session?.user ? dict.landing.ctaDashboard : dict.landing.ctaPrimary}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#pemetaan">{dict.landing.ctaSecondary}</Link>
            </Button>
          </div>
        </div>

        {/* The product's most characteristic artefact: one project moving through
            the five gates, each tied to a real SSDF task code. */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
            <p className="text-sm font-semibold">{dict.landing.traceTitle}</p>
            <p className="text-xs text-muted-foreground">{dict.landing.traceMeta}</p>
          </div>
          <div className="px-4 pt-3" aria-hidden="true">
            <div className="grid grid-cols-5 gap-1">
              {STAGE_CODES.map((s, i) => (
                <span
                  key={s.nist}
                  className="relative h-1.5 overflow-hidden rounded-sm bg-muted"
                >
                  {i < runningStage && (
                    <span
                      className="absolute inset-0"
                      style={{ background: `var(--stage-${i + 1})` }}
                    />
                  )}
                  {i === runningStage && (
                    <span
                      className="absolute inset-y-0 left-0 w-[55%]"
                      style={{ background: `var(--stage-${i + 1})` }}
                    />
                  )}
                </span>
              ))}
            </div>
          </div>
          <ol className="px-4 pb-2 pt-2">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-3 border-t py-2.5 text-sm first:border-t-0"
              >
                <span
                  className="pt-0.5 text-xs font-bold tabular-nums"
                  style={{ color: `var(--stage-${i + 1})` }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{step.title}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    {STAGE_CODES[i].nist}
                  </span>
                </span>
                <span
                  className="pt-0.5 text-xs font-medium"
                  style={{ color: statusColor(i) }}
                >
                  {statusFor(i)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pemetaan" className="mt-20">
        <h2 className="display-type text-2xl md:text-3xl">{dict.landing.mappingTitle}</h2>
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          {dict.landing.mappingSubtitle}
        </p>
        <div className="mt-8 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {dict.landing.mapStage}
                </th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  {dict.landing.mapNist}
                </th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  {dict.landing.mapIso}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {dict.landing.mapArtifact}
                </th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => (
                <tr key={step.title} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: `var(--stage-${i + 1})` }}
                        aria-hidden="true"
                      />
                      <span className="font-medium">{step.title}</span>
                    </span>
                    {/* Codes move under the title on narrow screens instead of
                        forcing a horizontally scrolled table. */}
                    <span className="mt-1 block font-mono text-[11px] text-muted-foreground sm:hidden">
                      {STAGE_CODES[i].nist} — {STAGE_CODES[i].iso}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">
                    {STAGE_CODES[i].nist}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                    {STAGE_CODES[i].iso}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{step.artifact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="display-type text-2xl md:text-3xl">{dict.landing.featuresTitle}</h2>
        <ul className="mt-8 grid gap-x-12 gap-y-7 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-3">
              <feature.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{feature.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
