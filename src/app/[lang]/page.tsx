import Link from "next/link";
import { auth } from "@/auth";
import { AboutSection } from "@/components/landing/about-section";
import { ArchitectureFlow } from "@/components/landing/architecture-flow";
import { AudienceTiles } from "@/components/landing/audience-tiles";
import { ClaySection } from "@/components/landing/clay-section";
import { Deliverables } from "@/components/landing/deliverables";
import { Faq } from "@/components/landing/faq";
import { GateCoupons } from "@/components/landing/gate-coupons";
import { GateLinkProvider } from "@/components/landing/gate-link";
import { Glossary } from "@/components/landing/glossary";
import { GuardGrid } from "@/components/landing/guard-grid";
import { HeroShield } from "@/components/landing/hero-shield";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingMotion } from "@/components/landing/landing-motion";
import { ProblemSection } from "@/components/landing/problem-section";
import { ProductPreview, type PreviewShot } from "@/components/landing/product-preview";
import { ProofSection } from "@/components/landing/proof-section";
import { StandardsStrip } from "@/components/landing/standards-strip";
import { SubStepsDisclosure } from "@/components/landing/substeps-disclosure";
import { PageTransition } from "@/components/page-transition";
import { fmt } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { GATE_MAPPING, LANDING_FACTS, SCORE_WEIGHTS, TEMPER, gateFacts } from "@/lib/landing-facts";
import { computeSecurityScore } from "@/lib/scanner/score";

// Real screenshots of the studio (public/landing), captured from a demo project.
const SHOT_FILES = [
  { src: "/landing/studio-workspace.jpg", width: 1440, height: 842 },
  { src: "/landing/security-score.jpg", width: 360, height: 460 },
  { src: "/landing/compliance-panel.jpg", width: 360, height: 460 },
] as const;

// Worked example for the score formula, computed by the real scoring function.
const EXAMPLE_FINDINGS = [{ severity: "medium" }, { severity: "medium" }, { severity: "low" }] as const;

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

  const facts = gateFacts();
  const stageDict = dict.stages as unknown as Record<string, { steps: Record<string, { label: string }> }>;
  const stepLabel = (code: string, id: string) => stageDict[code]?.steps?.[id]?.label ?? id;
  const gates = facts.map((g, i) => ({
    ...g,
    title: l.steps[i].title,
    why: l.steps[i].why,
    artifact: l.steps[i].artifact,
    temper: TEMPER[i],
    mapping: GATE_MAPPING[i],
    colourName: l.rail.colours[TEMPER[i].colour],
  }));
  const scanScore = computeSecurityScore([...EXAMPLE_FINDINGS]);
  const shots = SHOT_FILES.map((f, i) => ({ ...f, ...l.previewShots[i] })) as PreviewShot[];
  const factList = [
    { label: l.statStages, value: LANDING_FACTS.stages },
    { label: l.statNist, value: LANDING_FACTS.nistTasks },
    { label: l.statSubsteps, value: LANDING_FACTS.subSteps },
    { label: l.statProviders, value: LANDING_FACTS.providers },
  ];

  return (
    <PageTransition>
      <div className="landing">
        <LandingMotion>
          {/* Hero: giant spaced wordmark, the clay shield on its forge platform, then the real headline. */}
          <section className="relative overflow-hidden pb-16 pt-14 md:pt-20">
            <p
              aria-hidden="true"
              className="hero-wordmark animate-in fade-in-0 fill-mode-both px-4 text-center text-[clamp(3.25rem,12vw,10rem)] duration-700 max-lg:animate-none"
            >
              {l.heroWordmark}
            </p>
            <div className="-mt-[6%] px-4">
              <HeroShield />
            </div>
            <div className="mx-auto -mt-6 max-w-4xl px-4 text-center md:-mt-10">
              <h1 className="font-wide text-balance text-3xl md:text-5xl lg:text-6xl">{l.headline}</h1>
              <p className="mx-auto mt-6 max-w-[58ch] text-base leading-relaxed text-muted-foreground md:text-lg">{l.heroLede}</p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link href={primaryHref} className="clay-btn">
                  {primaryLabel}
                </Link>
                <Link href="#gerbang" className="clay-btn-ghost">
                  {l.ctaGates}
                </Link>
              </div>
              <p className="font-narrow mt-8 text-sm text-muted-foreground">{l.heroStandards}</p>
            </div>
          </section>

          <StandardsStrip label={l.stripLabel} items={l.stripItems} />

          <ClaySection id="dijaga" pill={l.pills.guard} title={l.guardTitle} lede={l.guardLede}>
            <GuardGrid cards={l.guardCards} />
          </ClaySection>

          <ClaySection id="masalah" pill={l.pills.problem} title={l.problemTitle} band>
            <ProblemSection
              stat={{
                show: l.problemStatShow === "true",
                text: l.problemStat,
                source: l.problemStatSource,
                url: l.problemStatUrl,
                newTab: l.newTab,
              }}
              items={l.problemList}
            />
          </ClaySection>

          <ClaySection id="tentang" pill={l.pills.about} title={l.aboutTitle} lede={l.aboutLede}>
            <AboutSection
              aiTitle={l.aboutAiTitle}
              ai={l.aboutAi}
              gateTitle={l.aboutGateTitle}
              gate={l.aboutGate}
              factsTitle={l.factsTitle}
              facts={factList}
              shot={shots[0]}
            />
          </ClaySection>

          <GateLinkProvider>
            <ClaySection id="gerbang" pill={l.pills.gates} title={l.gatesTitle} lede={l.gatesLede} band>
              <GateCoupons
                gates={gates.map((g) => ({
                  title: g.title,
                  why: g.why,
                  artifact: g.artifact,
                  celsius: fmt(l.gatesCelsius, { n: g.temper.celsius }),
                  colourName: g.colourName,
                  nist: [g.mapping.nist],
                  iso: g.mapping.iso,
                }))}
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
              <SubStepsDisclosure
                summary={fmt(l.gatesSubSteps, { count: LANDING_FACTS.subSteps })}
                gates={gates.map((g) => ({
                  title: g.title,
                  count: fmt(l.gatesSubStepsCount, { count: g.steps.length }),
                  steps: g.steps.map((s) => ({ label: stepLabel(g.code, s.id), nist: s.nist, iso: s.iso })),
                }))}
                labels={{ subStep: l.gatesSubStepCol, nist: l.mapNist, iso: l.mapIso }}
              />
            </ClaySection>

            <ClaySection id="pengguna" pill={l.pills.audience} title={l.audienceTitle}>
              <AudienceTiles items={l.audience} />
            </ClaySection>

            <ClaySection id="pratinjau" pill={l.pills.studio} title={l.previewTitle} band>
              <ProductPreview shots={shots} figureLabels={[1, 2, 3].map((n) => fmt(l.figure, { n }))} />
            </ClaySection>

            <ClaySection id="cara-kerja" pill={l.pills.how} title={l.howTitle} lede={l.howLede}>
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
                  scanScore,
                  scanExample: fmt(l.howScanExample, {
                    medium: 2,
                    low: 1,
                    wm: SCORE_WEIGHTS.medium,
                    wl: SCORE_WEIGHTS.low,
                    score: scanScore,
                  }),
                }}
              />
            </ClaySection>

            <ClaySection id="arsitektur" pill={l.pills.arch} title={l.archTitle} band>
              <ArchitectureFlow nodes={l.archNodes} lede={l.archLede} platformTitle={l.archPlatformTitle} platform={l.archPlatform} />
            </ClaySection>

            <ClaySection id="bukti" pill={l.pills.proof} title={l.proofTitle}>
              <ProofSection
                facts={[...factList, { label: l.statLanguages, value: LANDING_FACTS.languages }]}
                formulaTitle={l.proofFormulaTitle}
                formula={l.proofFormula}
                rows={gates.map((g) => ({ title: g.title, nist: [g.mapping.nist], iso: g.mapping.iso, artifact: g.artifact }))}
                matrix={gates.flatMap((g) =>
                  g.steps.map((s) => ({ gate: g.title, subStep: stepLabel(g.code, s.id), nist: s.nist, iso: s.iso })),
                )}
                labels={{
                  stage: l.mapStage,
                  nist: l.mapNist,
                  iso: l.mapIso,
                  artifact: l.mapArtifact,
                  download: l.proofDownload,
                }}
              />
            </ClaySection>
          </GateLinkProvider>

          <ClaySection id="hasil" pill={l.pills.results} title={l.resultsTitle} band>
            <Deliverables resultsTitle={l.resultsDeliverables} items={l.deliverables} limitsTitle={l.limitsTitle} limits={l.limits} />
          </ClaySection>

          <ClaySection id="pelajari" pill={l.pills.learn} title={l.learnTitle}>
            <Glossary items={l.glossary} />
            <h3 className="font-wide mt-20 text-center text-2xl md:text-3xl">{l.faqHeading}</h3>
            <div className="mt-8">
              <Faq items={l.faq} />
            </div>
          </ClaySection>

          {/* Start: a clay panel with a violet edge glow instead of a contact form. */}
          <section aria-labelledby="mulai-title" className="px-4 pb-28 pt-8">
            <div className="clay-card relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-16 text-center shadow-[var(--clay-shadow),0_0_70px_rgba(139,92,246,0.35)] md:px-12">
              <span className="clay-pill">{l.pills.start}</span>
              <h2 id="mulai-title" className="font-wide mt-5 text-balance text-3xl md:text-5xl">
                {l.closingTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-muted-foreground">{l.closingLede}</p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link href={primaryHref} className="clay-btn">
                  {primaryLabel}
                </Link>
                <Link href="#gerbang" className="clay-btn-ghost">
                  {l.ctaGates}
                </Link>
              </div>
            </div>
          </section>
        </LandingMotion>
      </div>
    </PageTransition>
  );
}
