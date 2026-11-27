import Link from "next/link";
import { Info } from "lucide-react";
import { auth } from "@/auth";
import { BookShelf } from "@/components/landing/books/book-shelf";
import type { StageCode } from "@/components/landing/books/book-list";
import { ClaySection } from "@/components/landing/clay-section";
import { Faq } from "@/components/landing/faq";
import { FuseWaves } from "@/components/landing/fuse-waves";
import { GalleryProvider } from "@/components/landing/gallery/gallery-provider";
import { HeroWall } from "@/components/landing/gallery/hero-wall";
import { TemplateShelf } from "@/components/landing/gallery/template-shelf";
import { LandingMotion } from "@/components/landing/landing-motion";
import { GateLoop } from "@/components/landing/loop/gate-loop";
import { primaryCta } from "@/components/landing/primary-cta";
import { ProblemSection } from "@/components/landing/problem-section";
import { ProductPreview, type PreviewShot } from "@/components/landing/product-preview";
import { StandardsStrip } from "@/components/landing/standards-strip";
import { PageTransition } from "@/components/page-transition";
import { fmt } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { GATE_MAPPING, LANDING_FACTS, gateFacts } from "@/lib/landing-facts";

// Real screenshots of the studio (public/landing), captured from a demo project.
const SHOT_FILES = [
  { src: "/landing/studio-workspace.jpg", width: 1440, height: 842 },
  { src: "/landing/security-score.jpg", width: 360, height: 460 },
  { src: "/landing/compliance-panel.jpg", width: 360, height: 460 },
] as const;

const STAGE_CODES: StageCode[] = ["analysis", "design", "development", "testing", "handover"];

interface HomePageProps {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const l = dict.landing;
  const session = await auth();
  const cta = primaryCta(lang, Boolean(session?.user));

  const stageDict = dict.stages as unknown as Record<string, { name: string; steps: Record<string, { label: string }> }>;
  const stepLabel = (code: string, id: string) => stageDict[code]?.steps?.[id]?.label ?? id;
  const loopGates = gateFacts().map((g, i) => ({
    code: g.code,
    title: l.steps[i].title,
    why: l.steps[i].why,
    artifact: l.steps[i].artifact,
    nist: [GATE_MAPPING[i].nist],
    iso: [...GATE_MAPPING[i].iso],
    steps: g.steps.map((s) => ({ label: stepLabel(g.code, s.id), nist: s.nist, iso: s.iso })),
  }));
  const matrix = loopGates.flatMap((g) => g.steps.map((s) => ({ gate: g.title, subStep: s.label, nist: s.nist, iso: s.iso })));
  const stageNames = Object.fromEntries(STAGE_CODES.map((c) => [c, stageDict[c]?.name ?? c])) as Record<StageCode, string>;
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
          <GalleryProvider lang={lang} appName={dict.app.name} labels={dict.categories} copy={l.gallery}>
            {/* Hero: headline first (LCP), then the gallery wall of the eight categories. */}
            <section id="mulai-hero" className="@container relative isolate overflow-hidden pb-16 pt-14 md:pt-20">
              <div className="mx-auto max-w-4xl px-4 text-center">
                <h1 className="font-wide text-balance text-3xl md:text-5xl lg:text-6xl">{l.gallery.headline}</h1>
                <p className="mx-auto mt-6 max-w-[58ch] text-base leading-relaxed text-muted-foreground md:text-lg">{l.gallery.sub}</p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                  <Link href={cta.href} className="clay-btn">
                    {l[cta.label]}
                  </Link>
                  <Link href="#rak" className="clay-btn-ghost">
                    {l.gallery.ctaShelf}
                  </Link>
                </div>
              </div>
              <FuseWaves className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[40%] w-full" />
              <div className="mt-12">
                <HeroWall />
              </div>
            </section>

            <StandardsStrip label={l.stripLabel} items={l.stripItems} facts={factList} />

            <ClaySection id="rak" pill={l.shelf.pill} title={l.shelf.title} lede={l.shelf.lede}>
              <TemplateShelf copy={l.shelf} />
            </ClaySection>
          </GalleryProvider>

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

          <ClaySection id="gerbang" pill={l.pills.gates} title={l.loop.title} lede={l.loop.lede}>
            <GateLoop gates={loopGates} labels={{ ...l.loop, nist: l.mapNist, iso: l.mapIso, artifact: l.mapArtifact }} matrix={matrix} />
          </ClaySection>

          <ClaySection id="pratinjau" pill={l.pills.studio} title={l.previewTitle} band>
            <ProductPreview shots={shots} figureLabels={[1, 2, 3].map((n) => fmt(l.figure, { n }))} />
          </ClaySection>

          <ClaySection id="hasil" pill={l.pills.results} title={l.books.title} lede={l.books.lede}>
            <BookShelf copy={l.books} stageNames={stageNames} />
          </ClaySection>

          <ClaySection id="batasan" pill={l.pills.limits} title={l.limitsSectionTitle} band>
            <div className="clay-card mx-auto max-w-3xl p-7">
              <h3 className="text-lg font-semibold">{l.limitsTitle}</h3>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {l.limits.map((item) => (
                  <li key={item} className="flex items-start gap-3 py-3">
                    <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <h3 className="font-wide mt-20 text-center text-2xl md:text-3xl">{l.faqHeading}</h3>
            <div className="mt-8">
              <Faq items={l.faq} defaultOpen={0} />
            </div>
          </ClaySection>

          {/* Start: a clay panel with an edge glow instead of a contact form. */}
          <section id="mulai" aria-labelledby="mulai-title" className="px-4 pb-28 pt-8">
            <div className="clay-card relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 pt-16 pb-24 text-center shadow-[var(--clay-shadow),0_0_70px_var(--fuse-glow)] md:px-12">
              <FuseWaves className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-60" />
              <div className="relative">
                <span className="clay-pill">{l.pills.start}</span>
                <h2 id="mulai-title" className="font-wide mt-5 text-balance text-3xl md:text-5xl">
                  {l.closingTitle}
                </h2>
                <p className="mx-auto mt-4 max-w-[48ch] text-muted-foreground">{l.closingLede}</p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                  <Link href={cta.href} className="clay-btn">
                    {l[cta.label]}
                  </Link>
                  <Link href="#gerbang" className="clay-btn-ghost">
                    {l.ctaGates}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </LandingMotion>
      </div>
    </PageTransition>
  );
}
