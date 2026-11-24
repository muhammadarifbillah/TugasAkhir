import Link from "next/link";
import { auth } from "@/auth";
import { AboutSection } from "@/components/landing/about-section";
import { ArchitectureFlow } from "@/components/landing/architecture-flow";
import { Deliverables } from "@/components/landing/deliverables";
import { Faq } from "@/components/landing/faq";
import { FeatureLedger } from "@/components/landing/feature-ledger";
import { GateCoupons } from "@/components/landing/gate-coupons";
import { GateLinkProvider } from "@/components/landing/gate-link";
import { Glossary } from "@/components/landing/glossary";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LedgerSection } from "@/components/landing/ledger-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { ProductPreview, type PreviewShot } from "@/components/landing/product-preview";
import { ProofSection } from "@/components/landing/proof-section";
import { QuenchRule } from "@/components/landing/quench-rule";
import { SubStepsDisclosure } from "@/components/landing/substeps-disclosure";
import { TemperRail } from "@/components/landing/temper-rail";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { LANDING_FACTS, SCORE_WEIGHTS, TEMPER, gateFacts } from "@/lib/landing-facts";
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
    colourName: l.rail.colours[TEMPER[i].colour],
  }));
  const scanScore = computeSecurityScore([...EXAMPLE_FINDINGS]);
  const shots = SHOT_FILES.map((f, i) => ({ ...f, ...l.previewShots[i] })) as [PreviewShot, PreviewShot, PreviewShot];

  return (
    <PageTransition>
      <div className="landing">
        <LandingMotion>
          <div className="mx-auto w-full max-w-6xl px-4">
            {/* Hero: the headline beside the temper rail, the page's one load-time moment. */}
            <section className="grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-6">
                <h1 className="font-wide text-balance text-4xl md:text-5xl lg:text-6xl">{l.headline}</h1>
                <p className="mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground md:text-lg">{l.heroLede}</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Button asChild size="lg">
                    <Link href={primaryHref}>{primaryLabel}</Link>
                  </Button>
                  <Link href="#gerbang" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    {l.ctaGates}
                  </Link>
                </div>
                <p className="font-narrow mt-8 text-sm text-muted-foreground">{l.heroStandards}</p>
              </div>
              <div className="lg:col-span-6">
                <TemperRail
                  gates={gates.map((g) => ({
                    title: g.title,
                    nist: g.steps[0].nist[0],
                    celsius: g.temper.celsius,
                    colourName: g.colourName,
                  }))}
                  labels={{
                    label: l.rail.label,
                    passed: l.rail.passed,
                    waiting: l.rail.waiting,
                    summary: fmt(l.rail.summary, { passed: gates.length, total: gates.length, score: 100 }),
                    replay: l.rail.replay,
                  }}
                />
              </div>
            </section>

            <LedgerSection n={1} id="masalah" title={l.problemTitle}>
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
            </LedgerSection>

            <LedgerSection n={2} id="tentang" title={l.aboutTitle} lede={l.aboutLede}>
              <AboutSection
                aiTitle={l.aboutAiTitle}
                ai={l.aboutAi}
                gateTitle={l.aboutGateTitle}
                gate={l.aboutGate}
                forTitle={l.aboutForTitle}
                forItems={l.aboutFor}
              />
            </LedgerSection>

            <GateLinkProvider>
              <LedgerSection n={3} id="gerbang" title={l.gatesTitle} lede={l.gatesLede}>
                <GateCoupons
                  gates={gates.map((g) => ({
                    title: g.title,
                    why: g.why,
                    artifact: g.artifact,
                    celsius: fmt(l.gatesCelsius, { n: g.temper.celsius }),
                    colourName: g.colourName,
                    nist: g.nist,
                    iso: g.iso,
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
              </LedgerSection>

              <LedgerSection n={4} id="cara-kerja" title={l.howTitle} lede={l.howLede}>
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
              </LedgerSection>

              <LedgerSection n={5} id="arsitektur" title={l.archTitle}>
                <ArchitectureFlow
                  nodes={l.archNodes}
                  lede={l.archLede}
                  platformTitle={l.archPlatformTitle}
                  platform={l.archPlatform}
                />
              </LedgerSection>

              <LedgerSection n={6} id="bukti" title={l.proofTitle}>
                <ProofSection
                  facts={[
                    { label: l.statStages, value: LANDING_FACTS.stages },
                    { label: l.statNist, value: LANDING_FACTS.nistTasks },
                    { label: l.statSubsteps, value: LANDING_FACTS.subSteps },
                    { label: l.statProviders, value: LANDING_FACTS.providers },
                    { label: l.statLanguages, value: LANDING_FACTS.languages },
                  ]}
                  formulaTitle={l.proofFormulaTitle}
                  formula={l.proofFormula}
                  rows={gates.map((g) => ({ title: g.title, nist: g.nist, iso: g.iso, artifact: g.artifact }))}
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
              </LedgerSection>
            </GateLinkProvider>

            <LedgerSection n={7} id="pratinjau" title={l.previewTitle}>
              <ProductPreview
                shots={shots}
                figureLabels={[fmt(l.figure, { n: 1 }), fmt(l.figure, { n: 2 }), fmt(l.figure, { n: 3 })]}
              />
            </LedgerSection>

            <LedgerSection n={8} id="fitur" title={l.featuresTitle}>
              <FeatureLedger groups={l.featureGroups} />
            </LedgerSection>

            <LedgerSection n={9} id="hasil" title={l.resultsTitle}>
              <Deliverables
                resultsTitle={l.resultsDeliverables}
                items={l.deliverables}
                limitsTitle={l.limitsTitle}
                limits={l.limits}
              />
            </LedgerSection>

            <LedgerSection n={10} id="glosarium" title={l.glossaryTitle}>
              <Glossary items={l.glossary} />
            </LedgerSection>

            <LedgerSection n={11} id="faq" title={l.faqTitle}>
              <Faq items={l.faq} />
            </LedgerSection>

            {/* Closing: the temper hairline cools to grey once (a quench) on desktop. */}
            <section className="pb-24 pt-8 text-center">
              <QuenchRule />
              <h2 className="font-wide mt-16 text-balance text-3xl md:text-5xl">{l.closingTitle}</h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-muted-foreground">{l.closingLede}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                <Button asChild size="lg">
                  <Link href={primaryHref}>{primaryLabel}</Link>
                </Button>
                <Link href="#gerbang" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  {l.ctaGates}
                </Link>
              </div>
            </section>
          </div>
        </LandingMotion>
      </div>
    </PageTransition>
  );
}
