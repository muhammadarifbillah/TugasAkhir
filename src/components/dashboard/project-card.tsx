import "./dashboard.css";
import Link from "next/link";
import { ArrowRight, GitPullRequest, RefreshCw } from "lucide-react";
import type { ProjectCardData } from "@/components/project-list";
import { Hallmark } from "@/components/landing/hallmark";
import { CategoryIcon } from "@/components/site-art/category-icon";
import { SiteArt } from "@/components/site-art/site-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";
import { GATE_CODES, gateRail } from "@/lib/dashboard-view";
import { fmt } from "@/lib/format";
import { categoryForTemplate } from "@/lib/site-categories";
import { GateRail } from "./gate-rail";
import { ScoreBlock } from "./score-block";

function statusBadge(status: string, d: Dictionary["dashboard"]) {
  if (status === "completed") return { variant: "success" as const, text: d.statusCompleted };
  if (status === "in_revision") return { variant: "warning" as const, text: d.statusInRevision };
  if (status === "draft") return { variant: "default" as const, text: d.statusDraft };
  return { variant: "muted" as const, text: d.statusInProgress };
}

// The title morph wrapper lives in ProjectList (vitest's react lacks it), passed in via renderTitle.
export function ProjectCard({
  project: p,
  dict,
  lang,
  revising,
  onRevise,
  renderTitle = (t) => t,
}: {
  project: ProjectCardData;
  dict: Dictionary;
  lang: string;
  revising: boolean;
  onRevise: () => void;
  renderTitle?: (title: React.ReactElement) => React.ReactNode;
}) {
  const category = categoryForTemplate(p.template);
  const status = statusBadge(p.status, dict.dashboard);
  const { activeIndex } = gateRail(p.activeStage, p.stageProgress);
  const stageNames = GATE_CODES.map((code) => dict.stages[code].name);
  const titleId = `project-${p.id}-title`;

  return (
    <article className="project-card flex h-full flex-col gap-3" aria-labelledby={titleId}>
      <div data-card-part="bezel" className="project-card-bezel mb-4">
        <div data-card-part="screen" className="project-card-screen" aria-hidden="true">
          <div className="project-card-art">
            <SiteArt category={category} pageIndex={0} labels={dict.categories} />
            <SiteArt category={category} pageIndex={1} labels={dict.categories} />
          </div>
        </div>
        <div data-card-part="lip" aria-hidden="true" className="project-card-lip">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} data-lip-dot="" />
          ))}
        </div>
        {/* Straddles the bezel's top edge (half outside the frame) so it never covers the screen. */}
        <span data-card-part="status" data-chip-edge="top" className="absolute left-4 top-0 z-10 -translate-y-1/2 rounded-md bg-card shadow-[0_1px_3px_rgb(10_25_49/0.1),0_1px_2px_-1px_rgb(10_25_49/0.1)]">
          <Badge variant={status.variant}>{status.text}</Badge>
        </span>
        <span
          data-card-part="category"
          aria-hidden="true"
          className="absolute bottom-0 right-5 z-10 flex size-[3.25rem] translate-y-[40%] items-center justify-center rounded-full bg-[#1A3D63] text-[#F6FAFD] shadow-[0_10px_18px_-8px_rgb(10_25_49/0.7)] ring-4 ring-[#F6FAFD] dark:bg-[#B3CFE5] dark:text-[#0A1931] dark:ring-[#1A3D63]"
        >
          <CategoryIcon id={category.id} className="size-6" />
          <span data-card-part="category-foot" className="absolute left-1/2 top-full h-2 w-5 -translate-x-1/2 rounded-b-md bg-[#1A3D63] dark:bg-[#B3CFE5]" />
        </span>
      </div>

      <hr className="border-dotted border-border" aria-hidden="true" />

      <div className="flex flex-col gap-2 px-1">
        {renderTitle(
          <h3 id={titleId} className="line-clamp-2 break-words text-2xl font-semibold leading-tight">
            {p.name}
          </h3>,
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {fmt(dict.dashboard.cardTemplate, { category: dict.categories.items[category.id].name })}
          </span>
          <Badge variant="secondary">#{p.stack}</Badge>
          <Badge variant="outline">
            {dict.dashboard.version}: {p.version}
          </Badge>
          {p.revisionCount > 0 && (
            <Badge variant="outline">
              <GitPullRequest className="size-3" /> {p.revisionCount}
            </Badge>
          )}
        </div>
      </div>

      <hr className="border-dotted border-border" aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-3 px-1">
        <div data-card-part="gate" className="flex items-center gap-2 text-sm">
          <span className="flex size-11 rounded-full shrink-0 items-center justify-center bg-muted">
            <Hallmark stage={activeIndex === null ? 5 : ((activeIndex + 1) as 1 | 2 | 3 | 4 | 5)} className="size-4" />
          </span>
          <span>
            {activeIndex === null ? (
              dict.dashboard.gatesAllDone
            ) : (
              <>
                {fmt(dict.dashboard.gateActive, { n: activeIndex + 1 })} · <strong>{stageNames[activeIndex]}</strong>
              </>
            )}
          </span>
        </div>
        {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <GateRail
            compact
            activeStage={p.activeStage}
            stageProgress={p.stageProgress}
            stageNames={stageNames}
            labels={{ gates: dict.dashboard.gatesLabel, gateActive: dict.dashboard.gateActive, allDone: dict.dashboard.gatesAllDone }}
          />
          <ScoreBlock
            compact
            score={p.score}
            scoreSource={p.scoreSource}
            scannedAt={p.scannedAt}
            scoreStale={p.scoreStale}
            labels={dict.dashboard}
          />
        </div>
        <div className="mt-auto flex flex-wrap justify-end gap-2">
          {p.status === "completed" && (
            <Button size="sm" variant="outline" className="h-11" onClick={onRevise} disabled={revising}>
              <RefreshCw className={`size-3 ${revising ? "animate-spin" : ""}`} />
              {dict.dashboard.revise}
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="h-11">
            <Link href={`/${lang}/studio/${p.id}/${p.activeStage}`} transitionTypes={["nav-forward"]}>
              {dict.dashboard.openStudio} <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
