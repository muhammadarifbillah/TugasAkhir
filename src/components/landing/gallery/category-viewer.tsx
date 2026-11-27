"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useId, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FuseLockup } from "@/components/brand/fuse-lockup";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { SITE_CATEGORIES, type SiteCategory } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import { EASE } from "../motion";
import { keyToAction, tabKey, type ViewerAction, type ViewerState } from "./gallery-logic";

type Labels = Dictionary["categories"];
type Copy = Dictionary["landing"]["gallery"];
type Item = { name: string; desc: string; features: Record<string, string>; checks: Record<string, string> };
type TemplateCopy = { templatePages: Record<string, string>; templates: Record<string, { desc: string }> };

// shortcut: both dictionaries ship to the client for these two subtrees; pass them through GalleryProvider once page.tsx may change.
const TEMPLATE_COPY: Record<string, TemplateCopy> = { id, en };
const licenseLabel = (license: string) => license.replace(/-/g, " ");
const LINK = "font-semibold text-[#1A3D63] underline underline-offset-2 hover:text-[#0A1931] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7]";

const slide = {
  enter: (dir: 1 | -1) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: -dir * 40, opacity: 0 }),
};
const ARROW =
  "inline-flex size-11 items-center justify-center rounded-full border border-[#B3CFE5] text-[#0A1931] transition-colors hover:bg-[#B3CFE5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7]";
const PRIMARY =
  "inline-flex min-h-11 items-center rounded-full bg-[#1A3D63] px-4 text-sm font-semibold text-[#F6FAFD] transition-colors hover:bg-[#0A1931] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6FAFD]";

export function ViewerBody({
  category,
  template,
  page,
  dir,
  lang,
  appName,
  labels,
  copy,
  onTemplate,
  onPage,
  onNext,
  onPrev,
  onSeeAll,
  slots,
}: {
  category: SiteCategory;
  template: number;
  page: number;
  dir: 1 | -1;
  lang: string;
  appName: string;
  labels: Labels;
  copy: Copy;
  onTemplate: (i: number) => void;
  onPage: (p: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onSeeAll?: () => void;
  slots?: { Title?: React.ElementType; Description?: React.ElementType };
}) {
  const Title = slots?.Title ?? "h2";
  const Description = slots?.Description ?? "p";
  const specId = useId();
  const tabsId = useId();
  const panelId = `${tabsId}-panel`;
  const item = labels.items[category.id] as unknown as Item;
  const names = TEMPLATE_COPY[lang] ?? TEMPLATE_COPY.en;
  const templates = SITE_TEMPLATES[category.id];
  const tpl = templates[template];
  const pageNames = tpl.pages.map((p) => names.templatePages[p.id]);
  const specs = [
    [copy.specPages, pageNames.join(" · "), copy.specFeatures, category.features.map((f) => item.features[f]).join(" · ")],
    [copy.specStack, category.stack.join(" · "), copy.specChecks, fmt(copy.checksCount, { n: category.checks.length })],
    [copy.specStandards, copy.standardsValue, copy.specScanner, copy.scannerValue],
  ];

  return (
    <div>
      <div data-viewer-bar="" className="flex items-center justify-between gap-4 border-b border-[#B3CFE5] pb-4 pr-14">
        <FuseLockup label={appName} className="h-5 w-auto text-[#0A1931]" />
        <p className="hidden text-sm text-[#1A3D63] sm:block">{copy.barTitle}</p>
        <a
          data-viewer-cta="bar"
          href={`/${lang}/projects/new`}
          className={PRIMARY}
        >
          {copy.start}
        </a>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_8.5rem] lg:gap-8">
        <div role="tabpanel" id={panelId} aria-labelledby={`${tabsId}-tab-${template}`} className="order-1 min-w-0">
          <div data-viewer-preview="" className="relative grid w-full max-w-full place-items-center py-6">
            <span
              data-viewer-circle=""
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 aspect-square w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B3CFE5]"
            />
            <button
              type="button"
              aria-label={copy.nextPage}
              onClick={onNext}
              className="relative block w-[80%] overflow-hidden rounded-[1.25rem] border border-[#B3CFE5] shadow-[0_24px_40px_-20px_rgb(10_25_49/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7]"
            >
              <span data-viewer-browser="" className="flex flex-col bg-[#0A1931]">
                <span data-viewer-browser-bar="" className="flex h-7 shrink-0 items-center gap-1.5 px-3">
                  {["bg-[#B3CFE5]", "bg-[#4A7FA7]", "bg-[#F6FAFD]"].map((dot) => (
                    <span key={dot} data-viewer-dot="" aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} />
                  ))}
                  <span className="ml-2 min-w-0 flex-1 truncate rounded-full bg-[#1A3D63] px-3 text-center text-[11px] leading-5 text-[#B3CFE5]">
                    {tpl.slug}.fuse.dev
                  </span>
                </span>
                <span className="relative block aspect-[16/10] overflow-hidden bg-[#F6FAFD]">
                  <AnimatePresence initial={false} mode="popLayout" custom={dir}>
                    <m.span
                      key={`${template}-${page}`}
                      custom={dir}
                      variants={slide}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.28, ease: EASE }}
                      className="absolute inset-0 block"
                    >
                      <Image
                        src={tpl.pages[page].src}
                        alt={`${tpl.name} — ${pageNames[page]}`}
                        fill
                        sizes="(min-width:1024px) 34vw, 92vw"
                        draggable={false}
                        className="object-cover object-top"
                      />
                    </m.span>
                  </AnimatePresence>
                </span>
              </span>
            </button>
          </div>
          <p data-viewer-preview-hint="" className="relative z-10 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A3D63]">
            {copy.previewHint}
          </p>
          <div data-viewer-credit="" className="relative z-10 mt-2 text-center text-xs leading-relaxed text-[#1A3D63]">
            <p>
              <span className="font-semibold text-[#0A1931]">{tpl.name}</span>
              {" · "}
              {copy.viewerCreditLicense}{" "}
              <a href={tpl.licenseUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                {licenseLabel(tpl.license)}
                <span className="sr-only"> {copy.viewerCreditNewTab}</span>
              </a>
              {" · "}
              <a href={tpl.source} target="_blank" rel="noopener noreferrer" className={LINK}>
                {copy.viewerCreditSource}
                <span className="sr-only"> {copy.viewerCreditNewTab}</span>
              </a>
            </p>
            {tpl.attribution && <p className="mt-1">{tpl.attribution}</p>}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" aria-label={copy.prevPage} onClick={onPrev} className={ARROW}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <p className="relative z-10 rounded-full bg-[#F6FAFD] px-3 text-sm font-medium text-[#0A1931]">{fmt(copy.pageOf, { n: page + 1, total: tpl.pages.length })}</p>
            <button type="button" aria-label={copy.nextPage} onClick={onNext} className={ARROW}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-[#1A3D63]">{copy.pageHint}</p>
          <p className="mt-1 text-center text-xs text-[#1A3D63]">{copy.viewerGalleryLabel}</p>
        </div>

        <div className="order-2 flex min-w-0 items-center gap-2 lg:order-3 lg:items-start">
          <ul
            aria-label={copy.thumbsLabel}
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto lg:max-h-[34rem] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pr-1"
          >
            {tpl.pages.map((p, i) => (
              <li key={p.id} className="w-28 shrink-0 lg:w-full">
                <button
                  type="button"
                  data-viewer-thumb=""
                  aria-label={pageNames[i]}
                  aria-current={i === page ? "true" : undefined}
                  onClick={() => onPage(i)}
                  className="block w-full rounded-xl border border-transparent p-2 opacity-70 transition-[opacity,background-color] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7] aria-[current=true]:border-l-[3px] aria-[current=true]:border-l-[#4A7FA7] aria-[current=true]:bg-[#B3CFE5] aria-[current=true]:opacity-100"
                >
                  <span aria-hidden="true" className="block overflow-hidden rounded-lg">
                    <Image src={p.thumb} alt="" width={400} height={250} sizes="8rem" draggable={false} className="block h-auto w-full" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-viewer-see-all=""
            onClick={onSeeAll}
            className="min-h-11 min-w-11 shrink-0 rounded-full px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A3D63] transition-colors hover:bg-[#B3CFE5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7] lg:py-3 lg:[writing-mode:vertical-rl]"
          >
            {copy.seeAllTemplates}
          </button>
        </div>

        <div className="order-3 min-w-0 lg:order-2">
          <Title className="font-wide text-3xl text-[#0A1931] md:text-4xl">{item.name}</Title>
          <p data-viewer-byline="" className="mt-2 text-xs uppercase tracking-wide text-[#1A3D63]">
            {fmt(copy.byline, { name: appName, n: templates.length })}
          </p>
          <div
            role="tablist"
            aria-label={copy.viewerTemplatesLabel}
            className="mt-4 flex flex-wrap gap-2"
            onKeyDown={(e) => {
              const i = tabKey(e.key, template, templates.length);
              if (i === null) return;
              // Arrows here switch templates; keep them from paging the preview (dialog-level handler).
              e.preventDefault();
              e.stopPropagation();
              onTemplate(i);
              e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[i]?.focus();
            }}
          >
            {templates.map((t, i) => (
              <button
                key={t.slug}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${i}`}
                aria-selected={i === template}
                aria-controls={panelId}
                tabIndex={i === template ? 0 : -1}
                onClick={() => onTemplate(i)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#B3CFE5] px-4 text-left text-sm font-medium text-[#0A1931] transition-colors hover:bg-[#B3CFE5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6FAFD] aria-selected:border-[#1A3D63] aria-selected:bg-[#1A3D63] aria-selected:text-[#F6FAFD] aria-selected:hover:bg-[#0A1931]"
              >
                <span>{t.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{licenseLabel(t.license)}</span>
              </button>
            ))}
          </div>
          <Description className="mt-4 text-base italic leading-relaxed text-[#1A3D63]">{names.templates[tpl.slug]?.desc}</Description>
          <p className="mt-3 text-sm leading-relaxed text-[#0A1931]">{item.desc}</p>
          <p className="mt-3 text-sm leading-relaxed text-[#0A1931]">{copy.intro}</p>
          <hr className="mt-5 border-[#B3CFE5]" />
          {/* Below sm every label/value pair stacks full width; from sm it is a 2-pair × 3-row table. */}
          {/* Explicit roles: WebKit drops table semantics once display is changed by max-sm:block. */}
          <table data-viewer-specs="" role="table" className="mt-4 w-full table-fixed text-left max-sm:block sm:table">
            <tbody role="rowgroup" className="max-sm:block">
              {specs.map(([k1, v1, k2, v2], i) => (
                <tr key={k1} role="row" className="align-top max-sm:block">
                  <th scope="row" role="rowheader" id={`${specId}-${i}-a`} className="py-2 pr-2 text-[11px] font-semibold uppercase tracking-wide text-[#1A3D63] max-sm:block max-sm:pb-0">
                    {k1}
                  </th>
                  <td role="cell" headers={`${specId}-${i}-a`} className="py-2 pr-3 text-sm text-[#0A1931] max-sm:block max-sm:pt-0.5">{v1}</td>
                  <th scope="row" role="rowheader" id={`${specId}-${i}-b`} className="py-2 pr-2 text-[11px] font-semibold uppercase tracking-wide text-[#1A3D63] max-sm:block max-sm:pb-0">
                    {k2}
                  </th>
                  <td role="cell" headers={`${specId}-${i}-b`} className="py-2 text-sm text-[#0A1931] max-sm:block max-sm:pt-0.5">{v2}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section data-viewer-review="" className="mt-6 border-t border-[#B3CFE5] pt-5">
            <div className="flex items-center gap-3">
              <span
                data-viewer-avatar=""
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0A1931] text-[#F6FAFD]"
              >
                <FuseLockup markOnly label={appName} className="h-5 w-auto" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0A1931]">{fmt(copy.reviewedBy, { name: appName })}</p>
                <p className="text-xs text-[#1A3D63]">{copy.scannerValue}</p>
              </div>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#0A1931]">{fmt(copy.checksTitle, { name: appName })}</h3>
            <ul className="mt-3 space-y-3">
              {category.checks.map((check) => (
                <li key={check.id} data-viewer-check="" className="text-sm text-[#0A1931]">
                  {item.checks[check.id]}
                  <span className="mt-0.5 block text-xs text-[#1A3D63]">
                    {fmt(copy.checkCodes, { nist: check.nist, iso: check.iso })}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <a
            href={`/${lang}/projects/new`}
            className={`mt-6 ${PRIMARY}`}
          >
            {copy.start}
          </a>
        </div>
      </div>
    </div>
  );
}

export function CategoryViewer({
  state,
  dispatch,
  lang,
  appName,
  labels,
  copy,
  onClosed,
}: {
  state: ViewerState;
  dispatch: React.Dispatch<ViewerAction>;
  lang: string;
  appName: string;
  labels: Labels;
  copy: Copy;
  onClosed: () => void;
}) {
  const category = SITE_CATEGORIES.find((c) => c.id === state.open);
  const toShelf = useRef(false);
  const onSeeAll = () => {
    toShelf.current = true;
    dispatch({ type: "close" });
  };
  return (
    <DialogPrimitive.Root
      open={state.open !== null}
      onOpenChange={(o) => {
        if (!o) dispatch({ type: "close" });
      }}
    >
      {category && (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0A1931]/85 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            onKeyDown={(e) => {
              const a = keyToAction(e.key);
              if (a) {
                e.preventDefault();
                dispatch({ type: a });
              }
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (toShelf.current) {
                toShelf.current = false;
                const h = document.getElementById("rak-title");
                h?.setAttribute("tabindex", "-1");
                h?.focus();
              } else onClosed();
            }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F6FAFD] text-[#0A1931] shadow-[0_30px_80px_-30px_rgb(10_25_49/0.6)] focus:outline-none lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[88vh] lg:w-[min(72rem,94vw)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[2rem]"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="relative p-5 md:p-8"
            >
              <DialogPrimitive.Close
                aria-label={copy.close}
                className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full text-[#0A1931] transition-colors hover:bg-[#B3CFE5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7]"
              >
                <X aria-hidden="true" className="size-5" />
              </DialogPrimitive.Close>
              <ViewerBody
                category={category}
                template={state.template}
                page={state.page}
                dir={state.dir}
                lang={lang}
                appName={appName}
                labels={labels}
                copy={copy}
                onTemplate={(i) => dispatch({ type: "template", index: i })}
                onPage={(p) => dispatch({ type: "goto", page: p })}
                onNext={() => dispatch({ type: "next" })}
                onPrev={() => dispatch({ type: "prev" })}
                onSeeAll={onSeeAll}
                slots={{ Title: DialogPrimitive.Title, Description: DialogPrimitive.Description }}
              />
            </m.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}
