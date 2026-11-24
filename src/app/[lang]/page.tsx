import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { AuroraBackdrop } from "@/components/landing/aurora-backdrop";
import { Deliverables } from "@/components/landing/deliverables";
import { Faq } from "@/components/landing/faq";
import { FeatureBento, type FeatureTile } from "@/components/landing/feature-bento";
import { HeroHeadline } from "@/components/landing/hero-headline";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingMotion } from "@/components/landing/landing-motion";
import { ProblemCards } from "@/components/landing/problem-cards";
import { ProductPreview, type PreviewShot } from "@/components/landing/product-preview";
import { Reveal } from "@/components/landing/reveal";
import { RevealRow } from "@/components/landing/reveal-row";
import { SectionHeading } from "@/components/landing/section-heading";
import { StageCarousel } from "@/components/landing/stage-carousel";
import { StageTraceDemo } from "@/components/landing/stage-trace-demo";
import { StatsBand } from "@/components/landing/stats-band";
import { TiltCard } from "@/components/landing/tilt-card";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { AI_PROVIDERS, LANDING_FACTS } from "@/lib/landing-facts";

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

const STANDARDS = ["NIST SP 800-218", "ISO 27001:2022", "Semgrep", "Trivy"];

// Real screenshots of the studio (public/landing), captured from a demo project.
const SHOT_FILES = [
  { src: "/landing/studio-workspace.jpg", width: 1440, height: 842 },
  { src: "/landing/security-score.jpg", width: 360, height: 460 },
  { src: "/landing/compliance-panel.jpg", width: 360, height: 460 },
] as const;

interface HomePageProps {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const l = dict.landing;
  const session = await auth();
  const primaryHref = session?.user ? `/${lang}/dashboard` : `/${lang}/login`;
  const primaryLabel = session?.user ? l.ctaDashboard : l.ctaPrimary;
  const steps = l.steps;

  const stats = [
    { value: LANDING_FACTS.stages, label: l.statStages },
    { value: LANDING_FACTS.nistTasks, label: l.statNist },
    { value: LANDING_FACTS.subSteps, label: l.statSubsteps },
    { value: LANDING_FACTS.providers, label: l.statProviders },
    { value: LANDING_FACTS.languages, label: l.statLanguages },
  ];

  const tiles: FeatureTile[] = [
    { key: "sdlc", title: l.featSdlcTitle, desc: l.featSdlcDesc },
    { key: "iso", title: l.featIsoTitle, desc: l.featIsoDesc },
    { key: "byok", title: l.featByokTitle, desc: l.featByokDesc },
    { key: "github", title: l.featGithubTitle, desc: l.featGithubDesc },
    { key: "docker", title: l.featDockerTitle, desc: l.featDockerDesc },
    { key: "db", title: l.featDbTitle, desc: l.featDbDesc },
    { key: "secure", title: l.featSecureTitle, desc: l.featSecureDesc },
    { key: "prompt", title: l.featPromptTitle, desc: l.featPromptDesc },
  ];

  const shots = SHOT_FILES.map((f, i) => ({ ...f, ...l.previewShots[i] })) as [PreviewShot, PreviewShot, PreviewShot];

  return (
    <PageTransition>
      <div className="landing">
        <LandingMotion>
          {/* 1. Hero */}
          <section className="relative isolate overflow-hidden">
            <AuroraBackdrop />
            <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
              <div>
                <p className="animate-in fade-in-0 fill-mode-both text-sm font-medium text-primary duration-500 max-lg:animate-none">
                  {l.heroEyebrow}
                </p>
                <div className="mt-4">
                  <HeroHeadline text={l.headline} />
                </div>
                <Reveal delay={0.15}>
                  <p className="mt-6 max-w-[42ch] text-base leading-relaxed text-muted-foreground md:text-lg">{l.lede}</p>
                </Reveal>
                <Reveal delay={0.25} className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="group">
                    <Link href={primaryHref}>
                      {primaryLabel}
                      <ArrowRight className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#cara-kerja">{l.ctaHow}</Link>
                  </Button>
                </Reveal>
                <Reveal delay={0.35} className="mt-8 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{l.standardsLabel}</span>
                  {STANDARDS.map((s) => (
                    <span key={s} className="rounded-full border bg-card/80 px-3 py-1 font-mono text-xs">
                      {s}
                    </span>
                  ))}
                </Reveal>
              </div>

              {/* The product's most characteristic artefact: one project moving through
                  the five gates, each tied to a real SSDF task code. */}
              <TiltCard>
                <StageTraceDemo
                  steps={steps}
                  codes={STAGE_CODES}
                  labels={{
                    title: l.traceTitle,
                    meta: l.traceMeta,
                    pass: l.statusPass,
                    running: l.statusRunning,
                    waiting: l.statusWaiting,
                    pause: l.demoPause,
                    play: l.demoPlay,
                  }}
                />
              </TiltCard>
            </div>
          </section>

          <div className="mx-auto w-full max-w-6xl px-4 pb-24">
            {/* 2. Problem */}
            <section id="masalah" aria-labelledby="masalah-title" className="mt-8 scroll-mt-20">
              <SectionHeading id="masalah-title" eyebrow={l.problemEyebrow} title={l.problemTitle} lede={l.problemLede} />
              <ProblemCards items={l.problems} />
            </section>

            {/* 3. Numbers */}
            <section id="angka" aria-labelledby="angka-title" className="mt-24 scroll-mt-20 md:mt-32">
              <SectionHeading id="angka-title" eyebrow={l.statsEyebrow} title={l.statsTitle} />
              <StatsBand items={stats} caption={l.statsCaption} />
            </section>

            {/* 4. Five gates */}
            <section id="gerbang" aria-labelledby="gerbang-title" className="mt-24 scroll-mt-20 md:mt-32">
              <SectionHeading id="gerbang-title" eyebrow={l.gatesEyebrow} title={l.storyTitle} lede={l.gatesLede} />
              <StageCarousel
                steps={steps}
                codes={STAGE_CODES}
                labels={{
                  tabs: l.gatesTabs,
                  prev: l.gatesPrev,
                  next: l.gatesNext,
                  pause: l.demoPause,
                  play: l.demoPlay,
                  artifact: l.gatesArtifact,
                  nist: l.mapNist,
                  iso: l.mapIso,
                }}
              />
            </section>

            {/* 5. How it works */}
            <section id="cara-kerja" aria-labelledby="cara-kerja-title" className="mt-24 scroll-mt-20 md:mt-32">
              <SectionHeading id="cara-kerja-title" eyebrow={l.howEyebrow} title={l.howTitle} lede={l.howLede} />
              <HowItWorks
                label={l.howTitle}
                steps={l.how}
                copy={{
                  prompt: l.howPrompt,
                  plan: l.howPlan,
                  planTitle: l.howPlanTitle,
                  approve: l.howApprove,
                  verified: l.howVerified,
                  finding: l.howFinding,
                  fixed: l.howFixed,
                  exports: l.deliverables.map((d) => d.title),
                }}
              />
            </section>

            {/* 6. Product preview */}
            <section id="pratinjau" aria-labelledby="pratinjau-title" className="mt-24 scroll-mt-20 md:mt-32">
              <SectionHeading id="pratinjau-title" eyebrow={l.previewEyebrow} title={l.previewTitle} lede={l.previewLede} />
              <ProductPreview shots={shots} url="shieldforge.local/studio" />
            </section>

            {/* 7. Control mapping */}
            <section id="pemetaan" aria-labelledby="pemetaan-title" className="mt-24 scroll-mt-20 md:mt-32">
              <SectionHeading id="pemetaan-title" eyebrow={l.mappingEyebrow} title={l.mappingTitle} lede={l.mappingSubtitle} />
              <Reveal className="soft-card mt-10 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-5 py-3 font-medium">
                        {l.mapStage}
                      </th>
                      <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">
                        {l.mapNist}
                      </th>
                      <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">
                        {l.mapIso}
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        {l.mapArtifact}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step, i) => (
                      <RevealRow key={step.title} index={i} tint={`var(--stage-${i + 1})`}>
                        <td className="border-s-4 px-5 py-3.5" style={{ borderInlineStartColor: `var(--stage-${i + 1})` }}>
                          <span className="font-medium">{step.title}</span>
                          {/* Codes move under the title on narrow screens instead of
                              forcing a horizontally scrolled table. */}
                          <span className="mt-1 block font-mono text-[11px] text-muted-foreground sm:hidden">
                            {STAGE_CODES[i].nist} — {STAGE_CODES[i].iso}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3.5 font-mono text-xs sm:table-cell">{STAGE_CODES[i].nist}</td>
                        <td className="hidden px-5 py-3.5 font-mono text-xs text-muted-foreground sm:table-cell">
                          {STAGE_CODES[i].iso}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{step.artifact}</td>
                      </RevealRow>
                    ))}
                  </tbody>
                </table>
              </Reveal>
            </section>

            {/* 8. Features */}
            <section id="fitur" aria-labelledby="fitur-title" className="mt-24 scroll-mt-20 md:mt-32">
              <SectionHeading id="fitur-title" eyebrow={l.featuresEyebrow} title={l.featuresTitle} />
              <FeatureBento tiles={tiles} stages={steps.map((s) => s.title)} providers={AI_PROVIDERS} />
            </section>

            {/* 9. Deliverables */}
            <section
              id="hasil"
              aria-labelledby="hasil-title"
              className="mt-24 grid scroll-mt-20 items-start gap-10 md:mt-32 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
            >
              <div>
                <SectionHeading id="hasil-title" eyebrow={l.deliverablesEyebrow} title={l.deliverablesTitle} lede={l.deliverablesLede} />
                <Reveal delay={0.1} className="mt-8">
                  <Button asChild size="lg">
                    <Link href={primaryHref}>{primaryLabel}</Link>
                  </Button>
                </Reveal>
              </div>
              <Deliverables items={l.deliverables} />
            </section>

            {/* 10. FAQ */}
            <section id="faq" aria-labelledby="faq-title" className="mt-24 scroll-mt-20 md:mt-32">
              <SectionHeading id="faq-title" eyebrow={l.faqEyebrow} title={l.faqTitle} align="center" />
              <Faq items={l.faq} />
            </section>

            {/* 11. Closing CTA */}
            <Reveal className="relative isolate mt-24 overflow-hidden rounded-3xl border px-6 py-16 text-center md:mt-32">
              <AuroraBackdrop className="[--aurora-strength:20%]" />
              <h2 className="display-type text-balance text-2xl md:text-4xl">{l.closingTitle}</h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-muted-foreground">{l.closingLede}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="group">
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#pemetaan">{l.ctaSecondary}</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </LandingMotion>
      </div>
    </PageTransition>
  );
}
