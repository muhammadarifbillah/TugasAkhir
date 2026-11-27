"use client";

import { useEffect, useReducer, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MotionConfig, m, useReducedMotion } from "motion/react";
import {
  Award, BookOpen, Database, Files, GitBranch, Grid3x3, History, MonitorSmartphone, Play, Radar, ShieldCheck, TriangleAlert, X,
} from "lucide-react";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { EASE } from "../motion";
import { BOOK_INITIAL, RESULT_BOOKS, bookReducer, booksOnShelf, type BookId, type ResultBook, type ShelfId, type StageCode } from "./book-list";

type Copy = Dictionary["landing"]["books"];
type Item = { title: string; contents: string; format: string; when: string };

const itemOf = (copy: Copy, id: BookId) => (copy.items as Record<BookId, Item>)[id];

/** Cover tones: steel stays off small text (fails AA), so it only paints ribbons and lines. */
const TONES = {
  ink: { bg: "#0A1931", fg: "#F6FAFD", ribbon: "#B3CFE5", edge: "#B3CFE5" },
  deep: { bg: "#1A3D63", fg: "#F6FAFD", ribbon: "#B3CFE5", edge: "#B3CFE5" },
  mist: { bg: "#B3CFE5", fg: "#0A1931", ribbon: "#1A3D63", edge: "#1A3D63" },
  snow: { bg: "#F6FAFD", fg: "#0A1931", ribbon: "#4A7FA7", edge: "#B3CFE5" },
} as const;
type Tone = keyof typeof TONES;
const TONE_ORDER: Tone[] = ["ink", "deep", "mist", "snow"];
const toneOf = (b: ResultBook): Tone => TONE_ORDER[RESULT_BOOKS.indexOf(b) % 4];

const ICONS: Record<ResultBook["icon"], React.ElementType> = {
  files: Files, branch: GitBranch, manual: BookOpen, shield: ShieldCheck, matrix: Grid3x3, badge: Award,
  radar: Radar, devices: MonitorSmartphone, threat: TriangleAlert, play: Play, database: Database, history: History,
};

/** Title on at most two lines, split at the space nearest the middle. */
function titleLines(title: string): string[] {
  if (title.length <= 14 || !title.includes(" ")) return [title];
  const mid = title.length / 2;
  let at = -1;
  for (let i = 0; i < title.length; i++) if (title[i] === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  return [title.slice(0, at), title.slice(at + 1)];
}

/** Line art for each result, drawn in the cover's 120 × 170 box (centre ≈ 60, 108). */
function CoverArt({ icon, line: ink, accent, dark }: { icon: ResultBook["icon"]; line: string; accent: string; dark: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (icon) {
    case "files":
      return (
        <g {...line}>
          {[0, 6, 12].map((o) => (
            <path key={o} d={`M${36 + o} ${86 + o} h30 l10 10 v40 h-40 z M${66 + o} ${86 + o} v10 h10`} opacity={0.5 + o / 24} />
          ))}
        </g>
      );
    case "branch":
      return (
        <g {...line}>
          <path d="M44 86 V136 M44 100 C44 112 76 108 76 122" />
          <circle cx="44" cy="86" r="5" fill={accent} />
          <circle cx="76" cy="96" r="5" fill={accent} />
          <circle cx="44" cy="136" r="5" fill={accent} />
          <path d="M76 101 V122 M70 116 L76 122 L82 116" />
        </g>
      );
    case "manual":
      return (
        <g {...line}>
          <rect x="36" y="82" width="48" height="58" rx="3" />
          {[94, 102, 110, 118, 126].map((y, i) => <path key={y} d={`M44 ${y} h${i % 2 ? 24 : 32}`} />)}
        </g>
      );
    case "shield":
      return (
        <g {...line}>
          <path d="M60 80 L84 88 V108 C84 124 72 134 60 140 C48 134 36 124 36 108 V88 Z" />
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={50 + c * 7} y={98 + r * 7} width="5" height="5" fill={r === c ? accent : "none"} strokeWidth={1} />))}
        </g>
      );
    case "matrix":
      return (
        <g {...line} strokeWidth={1.5}>
          {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => (
            <rect key={`${r}${c}`} x={38 + c * 11} y={86 + r * 11} width="9" height="9" fill={(r + c * 3) % 4 === 0 ? accent : "none"} />
          )))}
        </g>
      );
    case "badge":
      return (
        <g {...line}>
          <path d="M50 116 L44 142 L54 136 L58 146 L60 118 M70 116 L76 142 L66 136 L62 146 L60 118" />
          <circle cx="60" cy="102" r="18" fill={accent} fillOpacity={0.35} />
          <path d="M52 102 l6 6 l10 -12" />
        </g>
      );
    case "radar":
      return (
        <g {...line}>
          <circle cx="60" cy="110" r="26" />
          <circle cx="60" cy="110" r="14" opacity={0.6} />
          <path d="M60 110 L80 94" />
          <circle cx="70" cy="122" r="3.5" fill={accent} />
          <circle cx="48" cy="98" r="3.5" fill={accent} />
        </g>
      );
    case "devices":
      return (
        <g {...line}>
          <rect x="30" y="88" width="48" height="32" rx="3" />
          <path d="M46 128 h16 M54 120 v8" />
          <rect x="72" y="100" width="18" height="32" rx="3" fill={dark} />
          <path d="M79 127 h4" />
        </g>
      );
    case "threat":
      return (
        <g {...line}>
          <path d="M60 80 L76 106 H44 Z" fill={accent} fillOpacity={0.35} />
          <path d="M60 89 v8 M60 101 v1" />
          <rect x="32" y="122" width="14" height="12" rx="2" />
          <rect x="53" y="122" width="14" height="12" rx="2" />
          <rect x="74" y="122" width="14" height="12" rx="2" />
          <path d="M46 128 h7 M67 128 h7" />
        </g>
      );
    case "play":
      return (
        <g {...line}>
          <rect x="32" y="86" width="56" height="46" rx="4" />
          <path d="M32 96 h56" />
          <path d="M54 104 L68 113 L54 122 Z" fill={accent} />
        </g>
      );
    case "database":
      return (
        <g {...line}>
          <ellipse cx="60" cy="88" rx="20" ry="7" fill={accent} fillOpacity={0.35} />
          <path d="M40 88 V132 C40 141 80 141 80 132 V88 M40 103 C40 112 80 112 80 103 M40 118 C40 127 80 127 80 118" />
        </g>
      );
    case "history":
      return (
        <g {...line}>
          <path d="M38 110 A22 22 0 1 0 45 94" />
          <path d="M37 88 L45 94 L39 101" />
          <path d="M60 98 V110 L69 116" />
          <circle cx="60" cy="110" r="2.5" fill={accent} />
        </g>
      );
  }
}

export function BookCover({ book, title }: { book: ResultBook; title: string }) {
  const tone = TONES[toneOf(book)];
  const lines = titleLines(title);
  return (
    <svg viewBox="0 0 120 170" aria-hidden="true" className="block h-full w-full">
      <rect width="120" height="170" rx="4" fill={tone.bg} />
      <rect x="1" y="1" width="118" height="168" rx="3.5" fill="none" stroke={tone.edge} strokeWidth={book.shelf === "studio" ? 2 : 1} strokeOpacity={0.8} />
      <rect x="0" y="0" width="6" height="170" fill={tone.ribbon} opacity={0.85} />
      {lines.map((l, i) => (
        <text key={l} x="60" y={lines.length === 1 ? 44 : 38 + i * 15} textAnchor="middle" fill={tone.fg} fontSize="12" fontWeight="600">
          {l}
        </text>
      ))}
      <path d="M30 62 h60" stroke={tone.ribbon} strokeWidth={2} strokeLinecap="round" />
      <CoverArt icon={book.icon} line={tone.fg} accent={tone.ribbon} dark={tone.bg} />
    </svg>
  );
}

/** Two-page spread of an open book. Pure, so it renders in tests; the dialog passes Radix's Title as a slot. */
export function BookSpread({
  book,
  copy,
  stageName,
  slots,
}: {
  book: ResultBook;
  copy: Copy;
  stageName: string;
  slots?: { Title?: React.ElementType };
}) {
  const Title = slots?.Title ?? "h2";
  const item = itemOf(copy, book.id);
  const Icon = ICONS[book.icon];
  const rows: [string, string][] = [
    [copy.contents, item.contents],
    [copy.format, item.format],
    [copy.when, item.when],
    [copy.stage, stageName],
  ];
  return (
    <div className="grid overflow-hidden rounded-[1.5rem] bg-[var(--fuse-snow)] text-[#0A1931] shadow-[var(--fuse-shadow-soft)] md:grid-cols-2">
      <div data-book-page="left" className="relative p-7 md:border-r md:border-[#B3CFE5] md:p-9">
        <Icon className="size-14 text-[#1A3D63]" aria-hidden="true" />
        <Title className="font-wide mt-5 text-2xl md:text-3xl">{item.title}</Title>
        <p className="mt-2 text-sm text-[#0A1931]/75">{stageName}</p>
        {book.shelf === "studio" && (
          <span className="mt-4 inline-block rounded-full border border-[#1A3D63]/40 px-3 py-1 text-xs font-medium">{copy.studioBadge}</span>
        )}
      </div>
      <dl className="space-y-4 p-7 text-sm md:p-9">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="font-narrow text-xs uppercase tracking-wide text-[#1A3D63]">{k}</dt>
            <dd className="mt-1 leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Cover box is 132px wide at 120:170, so books meet the plank at this offset. */
const COVER_W = 132;
const COVER_H = Math.round((COVER_W * 170) / 120);

function ShelfBook({ book, copy, stageName, onOpen }: { book: ResultBook; copy: Copy; stageName: string; onOpen: (id: BookId, el: HTMLElement) => void }) {
  const title = itemOf(copy, book.id).title;
  const toneName = toneOf(book);
  const tone = TONES[toneName];
  return (
    <button
      type="button"
      data-book={book.id}
      data-shelf={book.shelf}
      data-cover-tone={toneName}
      aria-label={fmt(copy.open, { title })}
      onClick={(e) => onOpen(book.id, e.currentTarget)}
      style={{ width: COVER_W }}
      className="group relative block shrink-0 text-start focus-visible:outline-none"
    >
      <div className="relative aspect-[120/170] w-full rounded-l-sm rounded-r-md shadow-[4px_8px_14px_-6px_rgb(10_25_49/0.6)] transition-transform duration-300 ease-out group-hover:-translate-y-2 group-focus-visible:-translate-y-2 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-focus-visible:translate-y-0">
        <BookCover book={book} title={title} />
        {book.shelf === "studio" && (
          <span className="absolute inset-x-2 bottom-2 rounded-sm border border-[var(--ring)] bg-[#0A1931]/80 px-1 py-0.5 text-center text-[10px] font-medium leading-tight text-[var(--fuse-snow)]">
            {copy.studioBadge}
          </span>
        )}
        {/* Same book grammar as the template shelf: dark spine on the left, snow page block on the right. */}
        <div
          data-book-spine=""
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-2.5 rounded-l-sm bg-[linear-gradient(90deg,rgb(10_25_49/0.5),rgb(10_25_49/0.2))]"
        />
        <div
          data-book-pages="right"
          aria-hidden="true"
          className="absolute inset-y-1 right-0 w-[4px] rounded-r-sm motion-reduce:[transform:none] motion-reduce:w-[4px]"
          style={{ background: "repeating-linear-gradient(90deg, #F6FAFD 0 2px, #B3CFE5 2px 3px)" }}
        />
        <div
          data-book-pages="bottom"
          aria-hidden="true"
          className="absolute left-[3px] top-full h-[6px] w-[calc(100%-3px)]"
          style={{ background: "repeating-linear-gradient(180deg, #F6FAFD 0 2px, #B3CFE5 2px 3px)" }}
        />
        <div
          data-book-ribbon=""
          aria-hidden="true"
          className="absolute left-6 top-full z-10 h-7 w-2.5 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]"
          style={{ background: tone.ribbon }}
        />
      </div>
      {/* mt-9 clears the 28px ribbon hanging below the cover */}
      <span data-book-caption="" className="mt-9 block text-center">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{stageName}</span>
      </span>
    </button>
  );
}

/** The plank the books stand on, same board as the template shelf. */
function Plank() {
  return (
    <div
      data-book-plank=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -mx-2 h-3 rounded-sm bg-[#B3CFE5] ring-1 ring-inset ring-[#0A1931]/20 shadow-[0_14px_20px_-10px_rgb(10_25_49/0.55)] md:-mx-4"
      style={{ top: COVER_H - 5 }}
    />
  );
}

/**
 * One shelf, moving forever. The row paints three identical rails and the
 * keyframes shift by exactly one rail, so the wrap is invisible; hovering or
 * tabbing pauses it so a moving cover is still easy to click.
 */
function BookRow({
  items, copy, stageNames, onOpen,
}: { items: ResultBook[]; copy: Copy; stageNames: Record<StageCode, string>; onOpen: (id: BookId, el: HTMLElement) => void }) {
  return (
    <div data-book-case="" className="group/row relative mt-8">
      <div className="relative overflow-x-auto [scrollbar-width:none] pointer-fine:motion-safe:overflow-hidden">
        <div className="flex w-max animate-[book-scroll_48s_linear_infinite] group-hover/row:[animation-play-state:paused] group-focus-within/row:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1, 2].map((copyIndex) => (
            <div
              key={copyIndex}
              data-book-track={copyIndex === 0 ? "live" : "clone"}
              aria-hidden={copyIndex === 0 ? undefined : true}
              inert={copyIndex === 0 ? undefined : true}
              className="flex shrink-0 gap-7 pe-7"
            >
              {items.map((b) => (
                <ShelfBook key={b.id} book={b} copy={copy} stageName={stageNames[b.stage]} onOpen={onOpen} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <Plank />
    </div>
  );
}

function Shelf({
  shelf, title, lede, copy, stageNames, onOpen,
}: { shelf: ShelfId; title: string; lede: string; copy: Copy; stageNames: Record<StageCode, string>; onOpen: (id: BookId, el: HTMLElement) => void }) {
  return (
    <section data-book-shelf={shelf} className="mt-14 first:mt-0">
      <h3 className="font-wide text-xl md:text-2xl">{title}</h3>
      <p className="mt-2 max-w-[60ch] text-muted-foreground">{lede}</p>
      <BookRow items={booksOnShelf(shelf)} copy={copy} stageNames={stageNames} onOpen={onOpen} />
    </section>
  );
}

/** The two result shelves; a book opens into a dialog whose cover swings open (crossfade under reduced motion). */
export function BookShelf({ copy, stageNames }: { copy: Copy; stageNames: Record<StageCode, string> }) {
  const [state, dispatch] = useReducer(bookReducer, BOOK_INITIAL);
  const trigger = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const book = RESULT_BOOKS.find((b) => b.id === state.open);
  const open = (id: BookId, el: HTMLElement) => {
    trigger.current = el;
    dispatch({ type: "open", id });
  };

  useEffect(() => {
    if (reduced && state.open !== null && !state.turned) dispatch({ type: "turn" });
  }, [reduced, state.open, state.turned]);

  // LandingMotion skips animations below 1024px; opening a book animates at every width.
  return (
    <MotionConfig skipAnimations={false}>
      <Shelf shelf="home" title={copy.shelfHome} lede={copy.shelfHomeLede} copy={copy} stageNames={stageNames} onOpen={open} />
      <Shelf shelf="studio" title={copy.shelfStudio} lede={copy.shelfStudioLede} copy={copy} stageNames={stageNames} onOpen={open} />

      <DialogPrimitive.Root
        open={state.open !== null}
        onOpenChange={(o) => {
          if (!o) dispatch({ type: "close" });
        }}
      >
        {book && (
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(10_25_49/0.85)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                trigger.current?.focus();
              }}
              className="fixed inset-0 z-50 overflow-y-auto [background:var(--fuse-card-bg)] p-5 pt-16 [perspective:1600px] focus:outline-none md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[90vh] md:w-[min(56rem,94vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[2rem] md:p-8 md:pt-16"
            >
              <DialogPrimitive.Close
                aria-label={copy.close}
                className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden="true" className="size-5" />
              </DialogPrimitive.Close>
              <DialogPrimitive.Description className="sr-only">{itemOf(copy, book.id).contents}</DialogPrimitive.Description>
              <div className="relative [transform-style:preserve-3d]">
                <m.div
                  key={book.id}
                  initial={reduced ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <BookSpread book={book} copy={copy} stageName={stageNames[book.stage]} slots={{ Title: DialogPrimitive.Title }} />
                </m.div>
                {!state.turned && !reduced && (
                  <m.div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-full overflow-hidden rounded-[1.5rem] [backface-visibility:hidden] md:w-1/2"
                    style={{ transformOrigin: "left center", background: TONES[toneOf(book)].bg }}
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: -165 }}
                    // Expo-out hides the swing in the first frames; the cover needs a steady turn to read as an opening book.
                    transition={{ duration: 0.95, ease: [0.45, 0, 0.15, 1] }}
                    onAnimationComplete={() => dispatch({ type: "turn" })}
                  >
                    <BookCover book={book} title={itemOf(copy, book.id).title} />
                  </m.div>
                )}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </DialogPrimitive.Root>
    </MotionConfig>
  );
}
