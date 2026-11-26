# Saksi Design Blueprint (sebelumnya ShieldForge)

> Versi: 1.0 | Terakhir diperbarui: September 2026
> Tools: Next.js 16, Tailwind CSS v4, komponen UI lokal (Radix primitives), Archivo + Geist Mono (self-hosted)

---

## 1. Design System

### 1.1 Color Palette

#### Primary Colors

| Token | Light | Dark | Kegunaan |
|-------|-------|------|----------|
| `--primary` | `#2f5e9e` | `#7fa6dc` | Tombol aktif, link, brand |
| `--primary-foreground` | `#ffffff` | `#1e2227` | Teks di atas primary |
| `--background` | `#f4f6f8` | `#1e2227` | Background halaman |
| `--foreground` | `#15191e` | `#e7eaee` | Teks utama |

#### Stage (temper) Colors

The five Secure SDLC stages use the real steel tempering colours in physical order. They identify stages only, never status. Light values are pinned by `src/lib/contrast.test.ts` (each ≥ 4.5:1 as text on `#f4f6f8` and `#ffffff`).

| Token | Light | Temper colour | Temperature |
|-------|-------|---------------|-------------|
| `--stage-1` | `#8a6812` | straw | 205 °C |
| `--stage-2` | `#9f622d` | brown (was `#a5662f`, 4.27:1, fixed for AA) | 260 °C |
| `--stage-3` | `#6e4a93` | purple | 282 °C |
| `--stage-4` | `#2f5e9e` | dark blue | 310 °C |
| `--stage-5` | `#5e6f80` | grey-blue | 371 °C |

#### Semantic Colors

Token status (`--success`, `--warning`, `--danger`, `--destructive`, `--info`) didefinisikan di `src/app/globals.css`.

#### Surface Colors

| Token | Light | Dark | Kegunaan |
|-------|-------|------|----------|
| `--card` | `#ffffff` | `#272c33` | Background kartu |
| `--card-foreground` | `#15191e` | `#e7eaee` | Teks kartu |
| `--muted` | `#e9edf1` | `#2f353d` | Background halus |
| `--muted-foreground` | `#5b6470` | `#a3acb7` | Teks sekunder |
| `--border` | `#d5dbe2` | `#3a414a` | Semua border |
| `--accent` | `#e3e8ee` | `#323942` | Hover background |

### 1.2 Typography Scale

| Ukuran | Nilai | Contoh Penggunaan |
|--------|-------|-------------------|
| `text-xs` | 12px | Badge, label, meta info |
| `text-sm` | 14px | Body text, deskripsi |
| `text-base` | 16px | Default text |
| `text-lg` | 18px | Subheading |
| `text-xl` | 20px | Section title |
| `text-2xl` | 24px | Page title |
| `text-4xl` | 36px | Hero title (mobile) |
| `md:text-5xl` | 48px | Hero title (tablet) |
| `lg:text-6xl` | 60px | Hero title (desktop) |

#### Font Families

```
Sans: Archivo (self-hosted), ui-sans-serif, system-ui, sans-serif
Mono: Geist_Mono, ui-monospace, monospace
```

#### Font Weights

| Weight | Kegunaan |
|--------|----------|
| `font-normal` (400) | Body text |
| `font-medium` (500) | Labels, buttons |
| `font-semibold` (600) | Headings, emphasis |
| `font-bold` (700) | Titles, scores |

### 1.3 Spacing System

| Token | Nilai | Contoh |
|-------|-------|--------|
| `gap-1` | 4px | Icon-text gap |
| `gap-2` | 8px | Inline elements |
| `gap-3` | 12px | Card internal |
| `gap-4` | 16px | Card grid gap |
| `p-3` | 12px | Compact cards |
| `p-4` | 16px | Standard cards |
| `p-6` | 24px | Page sections |
| `px-4 py-8` | 16px 32px | Page container |

### 1.4 Border Radius

| Token | Nilai | Contoh |
|-------|-------|--------|
| `rounded-sm` | 4px | Badge kecil |
| `rounded-md` | 6px | Tombol, input, card kecil |
| `rounded-lg` | 8px | Card, panel |
| `rounded-xl` | 12px | Dialog, modal |
| `rounded-full` | 9999px | Avatar, pill |

Turunan dari `--radius: 0.5rem` di `src/app/globals.css` (`sm = radius - 4px`, `md = radius - 2px`, `lg = radius`, `xl = radius + 4px`).

### 1.5 Shadow System

Bayangan memakai utilitas `shadow` bawaan Tailwind 4 dan kelas `.card-elevated` berbasis `--shadow-color` di `src/app/globals.css`.

---

## 2. Page Layouts

### 2.1 Landing Page

Concept "Dark Clay" (PRD `docs/prd/2026-11-25-landing-claymorphism-prd.md`): claymorphism on a deep navy base with violet neon, after two cyber-security references. It follows the theme toggle, with Dark Clay as the default (`defaultTheme="dark"` app-wide): `html.dark:has(.landing)` gives Dark Clay and `html:not(.dark):has(.landing)` gives Light Clay (lavender paper, same layout and accents), each swapping the tokens for the whole document (header and footer included); other pages are unaffected, and high contrast overrides both. The five gates keep the steel temper colours (dark variants on Dark Clay, deepened light variants on Light Clay so they stay ≥ 4.5:1) and hallmark shapes (◇ ○ △ □ ⬡). The hero is fully server-rendered and visible without JavaScript: H1, sub-headline and lede come first and are the LCP element, then the Pita Pindai stage (aria-hidden) and an HTML findings table that carries the same information; there is no route `loading.tsx` above the landing. Every number and standard code is derived from code (`src/lib/landing-facts.ts`: `gateFacts()`, `GATE_MAPPING` = original seed crosswalk, `SCORE_WEIGHTS`) and pinned by tests. No testimonials, customer logos, awards or blog; the reference sections are replaced by real equivalents and the page states its limits.

```
Hero        #mulai-hero · H1 · sub-headline (ISO/IEC 27001:2022 first) · lede · [Start a free project → /register] [See a sample report → #bukti] · Pita Pindai stage (aria-hidden, server poster; desktop: pinned scroll timeline) · findings table
Strip       ISO/IEC 27001:2022 Annex A · NIST SSDF SP 800-218 (complement) · Semgrep · Trivy (text chips)
#masalah     cited Veracode figure (45% of tests) + 3 problems
#tentang     AI vs gates · the five guarded areas (clay cards) · facts card (count-up) · studio screenshot
#gerbang     5 temper coupons (auto carousel with pause, desktop) · all 26 sub-steps in <details>
#pengguna    3 audience tiles
#pratinjau   3 real studio screenshots as clay cards
#cara-kerja  6 steps with a live vignette (scan example = real scoring function; prompt shown in full, no typing)
#arsitektur  6 clay nodes with neon connectors + platform security
#bukti       facts · score formula · gate NIST/ISO table · CSV of 26 sub-steps
#hasil       deliverables | limits
#pelajari    9 glossary cards · 7 FAQ
#mulai       clay CTA panel with violet glow
```

**Spesifikasi:**
- Container `max-w-7xl px-4`; sections `py-24 md:py-32`, centred pill label + H2 + lede (`components/landing/clay-section.tsx`), alternate sections on `--clay-bg-2`.
- Type: Archivo width axis, `.font-wide` for H1/H2/figures; Geist Mono only for real codes.
- Surfaces (`globals.css`): `.clay-card` (24px radius, gradient, outer + inner double shadow, faint 1px edge), `.clay-btn` (violet gradient pill, glow, press squash), `.clay-btn-ghost`, `.clay-chip`, `.clay-pill`, `.coupon` (stage-tinted clay, glow ring when selected). No backdrop blur; glow is `box-shadow` only; high contrast drops shadows for 2px borders. Text pairs pinned in `src/lib/contrast.test.ts`.
- Components: `hero-tape`, `standards-strip`, `problem-section`, `about-section`, `gate-coupons`, `substeps-disclosure`, `gate-link`, `audience-tiles`, `product-preview`, `how-it-works`, `architecture-flow`, `proof-section`, `deliverables`, `glossary`, `faq`. `hero-shield.tsx` is kept as history until M5 and is not rendered.
- OG image (`src/app/opengraph-image.tsx`): navy with violet glow, the five temper colours with hallmarks and temperatures, "Mapped to NIST SP 800-218 v1.1 and ISO/IEC 27001:2022 Annex A".
- Hero tape (PRD 2026-11-26 landing-dashboard-3d, bab 10 and 13): `components/landing/hero-tape/model.ts` holds the example findings, the running score (`computeSecurityScore`), the finding codes (`enrichFinding`), the gate 4 stamp (`GATE_MAPPING`) and `poseOf(progress)`, a pure function of scroll progress (0/25/50/75/100% = PRD table); `POSTER_POSE` is the 50% pose with the stamp shown. Tokens `--tape-paper` (dark #ede6d3, light #f6f1e3), `--tape-ink`, `--finding-medium`, `--finding-low`, `--brake`, `--odometer-bg` are pinned in `src/lib/contrast.test.ts`. The figure (M2b) and the scroll timeline (M2c) follow. The figure (`components/landing/hero-tape/figure/`) is a server-rendered isometric SVG of 58 parts drawn with the anatomy kit (`components/iso/`), aria-hidden, at most 40 kB, posed by `frameOf(pose)`; its geometry is checked with `scripts/hero-tape/audit.ts` (kit audit) and the kit's `lines.mjs`.

### 2.2 Dashboard

Status: M4 done (PRD 2026-11-26 landing-dashboard-3d, bab 12): sticky toolbar, four stat cards, project cards with the five-gate rail, score with a text band and source line, empty state with a small Pita Pindai poster and three steps.

```
┌─────────────────────────────────────────────────────────┐
│ HEADER (global, sticky, shared with landing)            │
├─────────────────────────────────────────────────────────┤
│  Projects Dashboard                   [+ New Project]   │
│  subtitle                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │In progr. │ │Completed │ │In revis. │ │Avg score │    │
│  │ 3        │ │ 1        │ │ 1        │ │ 81       │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│ ┌─ sticky toolbar (top-0 of #main) ───────────────────┐ │
│ │ 🔍 Search (press /)  [Active gate ▾] [All][In ...]  │ │
│ └─────────────────────────────────────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐              │
│  │ Long project     │ │ Project B  [Done]│              │
│  │ title, 2 lines   │ │ #Next.js  v1.0   │              │
│  │         [Active] │ │ Gates            │              │
│  │ #React  v1.0     │ │ █ █ █ █ █        │              │
│  │ Gates            │ │ ⬡ All gates done │              │
│  │ █ █ ▭ ░ ░        │ │ Score 91 Good    │              │
│  │ △ Gate 3 active  │ │ Semgrep + Trivy, │              │
│  │ Score 72 Fair    │ │ 2026-11-24       │              │
│  │ AI estimate      │ │ [Revise] [Open]  │              │
│  │           [Open] │ └──────────────────┘              │
│  └──────────────────┘                                   │
│  Empty: poster (aria-hidden, no text) + title + lede    │
│         1. 2. 3. steps (list-decimal) + [New Project]   │
└─────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Container: `max-w-7xl mx-auto px-4 py-8`; title `text-xl font-semibold`, one `PageTransition`
- Stats: `DashboardStats` (server), `grid grid-cols-2 gap-3 lg:grid-cols-4`, counts from the existing project query, average of scanner scores only, no count-up animation
- Toolbar: inside `ProjectList`, `sticky top-0 z-20 -mx-4 border-b bg-background px-4 py-3` (sticks to the top of `#main`, solid background, no backdrop); `/` focuses `#project-search` (`isSearchShortcut`, ignored in editable fields and with modifiers)
- Gate filter: house `Select`, local state (`matchesGate`), no URL parameter; status chips keep working alongside it
- Card: title `line-clamp-2 break-words`, status badge `shrink-0`; `GateRail` = 5 segments `--stage-1..5` (done filled, active bordered `border-2`, pending `bg-muted`) + hallmark + text label; `ScoreBlock` = number, band text (Good/Fair/Poor), source line "Semgrep + Trivy, <date>" / AI estimate / not scanned / stale
- Empty: `DashboardEmpty` (server) with `HeroTapeFigure` in `.dashboard-poster iso hero-tape-figure` (aria-hidden, figure text hidden by `dashboard.css`, no landing motion hooks), `list-decimal` steps, CTA
- Gate order: `GATE_CODES` in `lib/dashboard-view.ts`, locked to `STAGE_DEFINITIONS` by a test (`lib/stages` stays out of the client bundle)
- No gsap, lenis or backdrop on the dashboard; `ProjectList` props `{ projects, dict, lang }` and `project-title-<id>` morph unchanged

### 2.3 Studio Workspace (3-Column)

```
┌─────────────────────────────────────────────────────────────────┐
│ ◀ Back | Project Name v1.0 [EN]                                │
│ 1.Analysis > 2.Design > 3.Dev > 4.Test > 5.Handover            │
│ Description...                              [Complete Stage]    │
├─────────────┬───────────────────────────┬───────────────────────┤
│ NAVIGATE    │ AI PROMPT ENGINE          │ SECURITY & COMPLIANCE │
│ (25%)       │ (50%)                     │ (25%)                 │
│             │                           │                       │
│ Sub-Steps:  │ ┌───────────────────────┐ │ Security Score        │
│ ☑ Scope     │ │ Stage Results          │ │ ┌─────────────────┐  │
│ ☑ Stack     │ │ (cards, tables, etc)  │ │ │ Score: 72/100    │  │
│ ☐ Security  │ │                       │ │ │ ████████░░░░░░  │  │
│ ☐ Data      │ ├───────────────────────┤ │ └─────────────────┘  │
│ ☐ Recommend │ │ Chat Messages         │ │                       │
│             │ │                       │ │ NIST Mapping          │
│ Deliverable │ │ User: [message]       │ │ ☑ PO.1.1             │
│ ▼ Stage 5   │ │ Bot: [response]       │ │ ☑ PW.1.1             │
│ ☐ Manual    │ │                       │ │ ☐ PS.1.1             │
│ ☐ Compliance│ │ ┌───────────────────┐ │ │                       │
│ ☐ Checklist │ │ │ [Plan] [Build]    │ │ │ Recommendations       │
│             │ │ │ [textarea...]     │ │ │ ┌─────────────────┐  │
│             │ │ │ [Send]            │ │ │ │ 🔴 SQL Injection │  │
│             │ │ └───────────────────┘ │ │ │ Add input valid  │  │
│             │ └───────────────────────┘ │ └─────────────────┘  │
├─────────────┴───────────────────────────┴───────────────────────┤
│ [Sub-steps & Deliverables] [AI Prompt Engine] [Security & Compliance] ← Mobile tabs │
└─────────────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Container: `flex md:h-[calc(100dvh-3.5rem)]`
- Grid: `grid grid-cols-1 md:grid-cols-12`
- Left: `md:col-span-4 lg:col-span-3` — Sub-steps (current step highlighted, `aria-current="step"`) + Deliverables
- Center: `md:col-span-8 lg:col-span-6` — tablist **Results & editor / Chat** (both panels stay mounted so Monaco keeps its state) + a composer that is always visible
- Right: `lg:col-span-3` — Security & Compliance with tabs **Score / Findings / Compliance / Traceability** (Traceability only in testing & handover)
- Mobile: tab "Sub-steps & Deliverables", "AI Prompt Engine", dan "Security & Compliance"

**Next Action Bar** (under the stepper, `next-action-bar.tsx`): shows the current sub-step + the list of remaining gaps (chip → opens the step result) + an "Ask AI" button that fills in the composer. When every requirement is met it shows a **Complete Stage** button → ConfirmDialog → toast → `router.push` to the next stage. Once the stage is completed it shows a link to the next stage.

**Security Score**: the score comes from `scoreInfo` (server) with a trust badge: *Verified by scanner* / *AI-generated* / *Stale* (the code changed after the last scan).

**Errors**: shown as `InlineAlert`s per area (`chat`, `stage`, `files`, `findings`) next to the control that triggered them. A failed prompt goes back into the composer.

**Confirmation**: completing a stage, deleting the database and restoring a snapshot all go through `ConfirmDialog`.

### 2.4 Settings Page

```
┌─────────────────────────────────────────────────────────┐
│ HEADER: Logo | Dashboard | Settings     [Lang] [Theme] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Settings                                               │
│  Manage your account and AI configuration               │
│                                                         │
│  ┌─────────────────┐ ┌─────────────────┐               │
│  │ 🐙 GitHub       │ │ 📊 Token usage  │               │
│  │ Connected: @user│ │ Prompts: 1,234  │               │
│  │ [Disconnect]    │ │ Tokens: 45,678  │               │
│  └─────────────────┘ └─────────────────┘               │
│                                                         │
│  🔑 BYOK Manager                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ AI Models & API Keys                            │   │
│  │ [Add API Key]                                   │   │
│  │ ┌───────────────────────────────────────────┐   │   │
│  │ │ Google AI | AIza...x9K | My Key | [Active]│   │   │
│  │ └───────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  │ AI Models                                       │   │
│  │ [Add model]                                     │   │
│  │ ┌───────────────────────────────────────────┐   │   │
│  │ │ gemini-3.6-flash | temp:0.7 | [Default ⭐]│   │   │
│  │ └───────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Login Page

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🛡️ Saksi                                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Sign In                                          │   │
│  │ Welcome back                                      │   │
│  │                                                  │   │
│  │ Email                                           │   │
│  │ [you@example.com________________________]       │   │
│  │                                                  │   │
│  │ Password                                        │   │
│  │ [••••••••••••________________________]           │   │
│  │                                                  │   │
│  │ [Sign In]                                        │   │
│  │                                                  │   │
│  │ ──────── or ────────                             │   │
│  │                                                  │   │
│  │ [Continue with GitHub]                           │   │
│  │                                                  │   │
│  │ Don't have an account? [Sign up]                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔒 BYOK  │  ⚙️ Engine  │  🐙 GitHub             │   │
│  │ Encrypt  │  Multi-     │  Push to               │   │
│  │ your keys│  provider   │  repo                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Component Specs

### 3.1 Header

```
Height: h-14 (56px)
Position: sticky top-0 z-40
Background: bg-background
Border: border-b

Left:  [Logo 28px] [App Name] [Nav Links (hidden mobile)]
Right: [Locale] [Theme] [Avatar Pill] [Logout]
```

### 3.2 Project Card

```
┌─────────────────────────────────────┐
│ Project Name              [Status]  │
│ Description text here...            │
│                                     │
│ [React] [Node] [v1.0]              │
│                                     │
│ 🔒 Security Score: 72%               │
│ ████████░░░░░░░░░░░░ (72%)          │
│                                     │
│ Stage 3/5    [Revise] [Open Studio] │
└─────────────────────────────────────┘

Border: rounded-xl border
Hover: hover:border-primary/50
Padding: CardHeader p-6 + CardContent p-6 pt-0
```

### 3.3 Stage Stepper

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Analysis & Requirements  2. Design & Architecture  3. Secure Development  4. Security Testing & Audit  5. Handover & Deliverables │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ States:                                                                                                                              │
│ - Active: bg-primary text-primary-foreground                                                                                         │
│ - Completed: text-success + CheckCircle2 icon                                                                                        │
│ - Locked: text-muted-foreground/50 + Lock icon                                                                                       │
│ - Default: text-muted-foreground hover:bg-accent                                                                                     │
│                                                                                                                                      │
│ Scroll: overflow-x-auto scrollbar-none                                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Chat Interface

```
┌─────────────────────────────────────┐
│ AI Prompt Engine          [Download]│
├─────────────────────────────────────┤
│                                     │
│ ┌───────────────────────────────┐  │
│ │ [Bot] Response text here...   │  │
│ └───────────────────────────────┘  │
│                                     │
│              ┌───────────────────┐  │
│              │ User message here │  │
│              └───────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ [📋 Plan] [🔨 Build]               │
│ ┌───────────────────────────────┐  │
│ │ Type your prompt...           │  │
│ │                               │  │
│ └───────────────────────────────┘  │
│ Ctrl+Enter to send        [Send]   │
└─────────────────────────────────────┘

User msg: bg-primary text-primary-foreground rounded-lg
Bot msg: border bg-card rounded-lg
Input: min-h-[3rem] resize-none text-sm
```

### 3.5 Plan Card

```
┌─────────────────────────────────────┐
│ 📋 Implementation Plan              │
│ 3 actions · 5 files                 │
├─────────────────────────────────────┤
│ Summary text here...                │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 1. Create User model            │ │
│ │    📁 prisma/schema.prisma      │ │
│ │    💡 Adds User, Session models │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 2. Create auth API              │ │
│ │    📁 api/auth/register/route   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⚠️ Will modify 3 files              │
│                                     │
│ [Approve & Build ✅]  [Cancel ❌]   │
└─────────────────────────────────────┘

Border: border-primary/30 bg-primary/5
Button: bg-primary hover:bg-primary/90
```

### 3.6 Step Result Dialog (Tabbed)

```
┌─────────────────────────────────────────────────────┐
│ Security Requirements                        [X]    │
│ Analysis & Requirements — Sub-Steps                  │
├─────────────────────────────────────────────────────┤
│ [Overview]  [Visual]  [Raw Data]                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Overview:                                           │
│ ┌─────────────────────────────────────────────┐    │
│ │ Security Requirements                       │    │
│ │ 5 persyaratan keamanan teridentifikasi.     │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│ Visual:                                             │
│ ┌─────────────────────────────────────────────┐    │
│ │ ☐ 1. JWT token rotation                     │    │
│ │ ☐ 2. Password hashing (bcrypt)              │    │
│ │ ☐ 3. CSRF protection                        │    │
│ │ ☐ 4. Input sanitization                     │    │
│ │ ☐ 5. Rate limiting                          │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│ Raw Data:                                           │
│ ┌─────────────────────────────────────────────┐    │
│ │ ["JWT token rotation", "Password hashing... │    │
│ └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘

Tab bar: border-b, active bg-primary/15 text-primary
Content: max-h-[70vh] overflow-y-auto p-3 sm:p-4
```

### 3.7 Security Score Panel

```
Tab "Score":
┌─────────────────────────────────────────┐
│ Score                         [72 / 100]│
│ ████████░░░░░░░░░░░░                    │
│ [Verified by scanner]                   │
└─────────────────────────────────────────┘

Tab "Compliance":
┌─────────────────────────────────────────┐
│ Stage Security Parameters               │
│ [PO] [PW] [PS]                          │
│ NIST SSDF → ISO 27001                   │
│ [PO.1.1] [PW.1.1] [PS.1.1]              │
│ [A.5.1] [A.8.2] [A.8.3]                 │
│                                         │
│ Secure parameters for this stage        │
│ ✓ scope refinement                      │
│                                         │
│ NIST SSDF Checks                        │
│ ┌ PO ────────────────────────────── ✓ ┐ │
│ │ PO.1.1                            ✓ │ │
│ └─────────────────────────────────────┘ │
│ ISO 27001 Mapping                       │
│ A.5.1                                 · │
└─────────────────────────────────────────┘

Progress: color coded (green >=85, amber >=60, red <60)
```

Skor tampil di tab **Score**; Stage Security Parameters, NIST SSDF Checks (dikelompokkan per PO/PW/PS/RV), dan ISO 27001 Mapping tampil di tab **Compliance** (NIST/ISO hanya bila ada rekomendasi). Tanda ✓ berarti kontrol sudah diterapkan, `·` berarti belum.

### 3.8 Recommendation Card

```
┌─────────────────────────────────────┐
│ [HIGH] [secure_coding]              │
│ SQL Injection Prevention            │
│                                     │
│ Use parameterized queries for all   │
│ database operations...              │
│                                     │
│ NIST: PW.8.2  ISO: A.8.26         │
│                                     │
│ [Apply Fix] [✓ Applied]            │
└─────────────────────────────────────┘

Severity colors: mengikuti token tema — critical/high `danger`, medium `warning`, low `info`.
```

---

## 4. Responsive Behavior

### 4.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Default | <640px | Single column, mobile tabs |
| `sm` | 640px+ | 2-column grids |
| `md` | 768px+ | Desktop nav, 2-column layouts |
| `lg` | 1024px+ | Studio tiga kolom; landing memakai margin rail `§n`, kupon gerbang menampilkan label tahap, motion landing aktif |

### 4.2 Studio Workspace Responsive

```
Desktop (lg+):           Tablet (md):            Mobile (<md):
┌────┬────────┬────┐    ┌──────┬────────┐      ┌──────────┐
│Left│ Center │Rght│    │ Left │ Center │      │ [Sub-steps & Deliverables]│
│3/12│ 6/12   │3/12│    │4/12  │ 8/12   │      │ [AI Prompt Engine]    │
│    │        │    │    │      │        │      │ [Security & Compliance] │
└────┴────────┴────┘    └──────┴────────┘      └──────────┘
                        Security = drawer      Content switches
                        on the right (button   per active tab
                        in the header, Esc/backdrop closes it)
```

### 4.3 Mobile Tab Bar

```
┌─────────────────────────────────────┐
│ [Sub-steps & Deliverables] [AI Prompt Engine] [Security & Compliance] │
├─────────────────────────────────────┤
│ Active: border-b-2 border-primary   │
│ Inactive: text-muted-foreground     │
│ Only visible: md:hidden             │
└─────────────────────────────────────┘
```

### 4.4 Header Responsive

```
Desktop (md+):                    Mobile (<md):
┌──────────────────────────┐     ┌──────────────────────┐
│ [Logo] Name [Nav] [User] │     │ [Logo] Name [≡ Menu] │
└──────────────────────────┘     └──────────────────────┘
                                  Menu tampil di sisi kanan, fade + scale 150ms (tanpa slide)
                                  w-64, overlay bg-black/50
```

---

## 5. Interaction Patterns

### 5.1 Plan → Build Flow

```
1. User types prompt (Plan mode)
2. POST /api/chat/plan
3. AI generates plan JSON
4. PlanCard appears with actions
5. User reviews plan
6. User clicks "Approve & Build"
7. Auto-switch to Build mode
8. Auto-send build prompt
9. POST /api/chat/build
10. AI executes plan
11. Toast: "Build complete: {created} files created, {modified} modified"
12. BuildResultCard shows summary
13. Auto-switch back to Plan mode
```

### 5.2 Stage Navigation

```
1. Click stage in stepper
2. Validate current stage gaps
3. If gaps exist → show warning
4. If no gaps → navigate to stage
5. Load stage data from server
6. Update workspace layout
7. Show stage-specific panels
```

### 5.3 Real-time Updates

```
1. User sends prompt
2. Optimistic UI (user message appears)
3. API call ke /api/chat/plan (mode Plan) atau /api/chat/build (mode Build)
4. Loading indicator (Bot + spinner)
5. Response received
6. Parse structured JSON
7. Update state (messages, results, scores)
8. Router.refresh() for server data
9. Scroll to bottom
```

### 5.4 Step Result Popup

```
1. Click 👁 icon on sub-step
2. Dialog opens with tabbed view
3. Default tab: Overview
4. User can switch tabs
5. Click outside or X → close
6. Content updates in real-time
```

---

## 6. Icon System

### 6.1 Size Scale

| Size | Pixels | Contoh |
|------|--------|--------|
| `size-3` | 12px | Inline icons |
| `size-3.5` | 14px | Icon + text |
| `size-4` | 16px | Standard icons |
| `size-5` | 20px | Section icons |
| `size-6` | 24px | Feature icons |
| `size-7` | 28px | Logo container |

### 6.2 Color Mapping

| Color | Kegunaan |
|-------|----------|
| `text-primary` | Brand, active states |
| `text-success` | Safe, completed, high score |
| `text-warning` | Caution, medium score |
| `text-destructive` | Error; skor rendah memakai `text-danger` |
| `text-muted-foreground` | Secondary, inactive |

---

## 7. Animation System

### 7.1 Transitions

Motion is there to make the app feel responsive, not to decorate it. It uses three layers, cheapest first:

| Layer | Tool | Used for |
|---|---|---|
| CSS | Tailwind + `tw-animate-css` | Dialog/Select open-close (`data-[state]:animate-in`), InlineAlert, security drawer (md), hero text, button press `active:scale-[0.98]` |
| Route change | React `<ViewTransition>` (`components/page-transition.tsx`) | Landing, dashboard, studio pages |
| In-app | `motion` (`motion/react`) via `LazyMotion strict` + `domMax` loaded async (`components/motion-provider.tsx`) | Tab indicators, toasts, menus, chat messages, plan/build cards, score, sub-step icons, project grid, landing reveals |

**Landing motion** (`components/landing/`, easing `EASE = [0.16, 1, 0.3, 1]` in `motion.ts`). One load-time moment; everything else answers the user. **Desktop only (≥ 1024px):** below that `LandingMotion` sets `MotionConfig skipAnimations`, timers check `isDesktop()`, and the page renders final states (no auto-advance, no pause buttons).

| # | Element | Trigger | Motion | Reduced motion |
|---|---|---|---|---|
| M1 | Hero Pita Pindai | Scroll (desktop gate) | stage + caption pinned in #main for 1 600 px, scrub 0.6; pose = poseOf(progress): heads light, brake clamps, odometer 100 → 096 → 092 → 091, stamp prints; scrolling back reverses | server poster (pose 50% + stamp), no motion |
| M2 | Section headings (H2) | First time 80% in view (desktop gate) | fade + rise 16 px, 0.4 s, power2.out, once | none (heading always visible; nothing is hidden without JavaScript) |
| M3 | Gate coupons | In view | the selected coupon's bottom edge fills over 4.5 s (CSS, `onAnimationEnd` advances); selected coupon glows in its stage colour; panel crossfade; pauses on hover, focus, offscreen, hidden tab, button | crossfade, still rotating, pause button |
| M4 | Clay cards / buttons | Hover, focus / press | cards lift 4 px with a deeper shadow; buttons squash (`translateY(1px) scale(.98)`) | shadow/colour only |
| M5 | How-it-works vignette | Tab change | staggered rows, score 0→91, diff flash, ticks; the prompt is shown in full (no typing caret) | final state |
| M6 | Facts numbers | First in view | count-up | kept |
| M7 | Route change | Navigation | existing `<ViewTransition>` types | crossfade |
| M8 | Architecture node | Click/focus | glow outline + highlighted connectors, note crossfade | same |
| M9 | Hero gallery wall | Hover/focus (all widths); pointer under `LANDING_MOTION_QUERY` | panel lifts 12 px; curved CSS 3D wall (rotateY ≤ 21°), wall tilts ≤ 3° with the pointer | flat row, lift off, no tilt |
| M10 | Category viewer | Open / page change (all widths) | scale + fade in 0.32 s; page crossfade + 40 px slide | crossfade only |
| M11 | Template shelf cover | Hover/focus (all widths) | cover rises 8 px and tilts 2° | none |

Gallery interactions (M9 lift, M10, M11) run at every width inside their own MotionConfig skipAnimations={false}; the M9 tilt is the only parallax and stays behind LANDING_MOTION_QUERY.

Removed from the landing page: aurora, card tilt, parallax, bento spotlight/lift, whole-section fade-ups (only the H2 heading enters, see M2) and the looping hero demo; the shield emblem, the wordmark and the typing caret (M3). Scroll-linked animation is allowed only under "Landing scroll (GSAP + Lenis)" below.

**Landing scroll (GSAP + Lenis)** (PRD `docs/prd/2026-11-26-landing-dashboard-3d`, bab 24 a–c; replaces the earlier "no smooth-scroll library, no GSAP" rule):
- **Landing only (a).** `LandingMotion` loads `gsap`, `gsap/ScrollTrigger` and `lenis` with dynamic `import()` only when `LANDING_MOTION_QUERY` in `motion.ts` matches: `(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)`. Otherwise the modules are not downloaded (0 B), not merely disabled. Dashboard, studio, settings and auth pages never import them and keep native scroll.
- **Scroller is `#main`.** Lenis wraps `#main` with `#main-content` as content; `#main` is `position: relative` so `sr-only` text cannot make `window` scroll. `landing-scroll-init.ts` sets `autoRaf: false`, `anchors: true`, drives Lenis from `gsap.ticker`, calls `lagSmoothing(0)` and `ScrollTrigger.defaults({ scroller: main })`. Unmount (route change, StrictMode) kills every ScrollTrigger and destroys Lenis.
- **Desktop only (b).** Below 1024 px or with a coarse pointer there is no ScrollTrigger and no `.pin-spacer`.
- **Reduced motion (c): reduce, not remove.** The hero shows a static pose (50% or final); fades and colour changes may stay; no information disappears (findings table, odometer 91, stamp); no automatic loop.
- **Limits.** One pin (hero, M2) of at most 1 600 px scroll, no snap, no automatic `scrollTo`, anchors jump directly.
- **Licences.** GSAP: "Standard no-charge" licence (not MIT). Lenis: MIT. Anatomy kit (`components/iso/`): MIT.

Tokens (`globals.css`): `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--dur-fast: 120ms`, `--dur-base: 200ms`, `--dur-slow: 300ms`. In-app interactions stay within 120–300 ms and never block input.

**View-transition types** (set via `<Link transitionTypes>` / `router.push(href, { transitionTypes })`):
- `nav-forward`: 60px slide left + fade (next stage, open studio, complete stage).
- `nav-back`: 60px slide right (earlier stage, back to dashboard). The direction comes from `navDirection()` in `lib/nav-direction.ts`.
- `page-fade`: crossfade for untyped navigations.
- `default="none"`, so `router.refresh()` never animates.
- `site-header` and `studio-topbar` are anchored and do not move.
- The project title morphs from the dashboard card to the studio breadcrumb (`project-title-<id>`).

**Motion components** (always `m.*`, never `motion.*`):
- Sliding indicators (`layoutId`): `center-tab-indicator`, `panel-tab-indicator`, `composer-mode-indicator`, `mobile-tab-indicator`.
- Toasts enter/exit and can be swiped right to dismiss.
- Menus scale/fade.
- New chat messages slide up (loaded history stays still).
- `AnimatedNumber` springs the security score.
- Sub-step icons pop when their status changes.
- The Complete button pops with a one-time ring.
- Project cards reflow on filter (`layout`).
- Landing: see "Landing motion" above.

**Rules**
- Animate only `transform`, `opacity` and colour.
- Never put `layout`, `layoutId` or a transformed `m.*` on an ancestor of Monaco (`CodeWorkspace`, `MonacoDiff`, `RunWorkspace`), because it breaks cursor and click positions.
- `prefers-reduced-motion: reduce` means **reduce, not remove** (Windows sets it whenever "Animation effects" is off). Removed: slides, zoom, bounce/ping, layout travel, page slides (they become a crossfade) and scroll snap. Kept: fades, colour changes, the score and landing count-ups, the temper rail (colour only) and the gates carousel (crossfade, with a pause button). Implemented in `globals.css` (tw-animate translate/scale vars zeroed, view-transition overrides) and `MotionConfig reducedMotion="user"` (Motion drops transforms, keeps opacity).
- No glassmorphism (`backdrop-blur`). GSAP and Lenis are allowed on the landing page only, under "Landing scroll (GSAP + Lenis)".
- `prefers-contrast: more` / high-contrast toggle: landing coupon texture removed and borders at full strength.

### 7.2 Hover States

| Element | Hover Effect |
|---------|-------------|
| Cards | `hover:border-primary/50` |
| Buttons | `hover:bg-primary/90` |
| Links | `hover:text-foreground` |
| Table rows | `hover:bg-muted/50` |

---

## 8. Accessibility

### 8.1 Focus States

```css
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

### 8.2 Keyboard Navigation

- Tab order follows visual layout
- Enter/Space activates buttons
- Escape closes dialogs and menus
- Arrow keys (and Home/End) move focus within tablists (studio panels and the step result dialog), the Plan/Build radiogroup, and menus (user menu and the studio "..." menu)
- Ctrl+Enter sends chat
- Ctrl/Cmd+K opens the command palette (stages, sub-steps, panels, actions)
- Alt+1..5 switches to that stage (if it is not locked)
- Ctrl/Cmd+Shift+Enter approves & builds the active plan

### 8.3 Screen Reader

- Ikon lucide menyembunyikan diri secara otomatis dengan `aria-hidden="true"`; ikon yang diberi prop `aria-*` sengaja tetap terbaca
- Setiap tombol ikon (`size="icon"`) punya `aria-label`; tombol berteks memakai teksnya sebagai nama
- Dialog Radix (confirm, command palette) diberi nama lewat `DialogTitle`
- Tiga popup layar penuh (design studio, fullscreen viewer, run workspace) memakai `role="dialog"`, `aria-modal="true"`, dan `aria-labelledby`
- Progress bar Radix menerima `aria-valuenow` lewat `value`; tidak ada `role="progressbar"` kustom

---

## 9. Dark/Light Mode

### 9.1 Implementation

```tsx
<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
```

### 9.2 Toggle

```tsx
// Sun/Moon icon with rotation animation
<sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
<moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
```

### 9.3 CSS Variables

- Both light and dark mode variables defined in `:root` and `.dark`
- All semantic tokens have both variants
- Nilai warna didefinisikan sebagai variabel CSS di `src/app/globals.css`

---

## 10. File Structure

```
src/
├── app/
│   ├── globals.css          ← Design tokens
│   └── [lang]/
│       ├── layout.tsx       ← Root layout (per-locale)
│       ├── page.tsx         ← Landing
│       ├── dashboard/       ← Dashboard
│       ├── studio/          ← Studio workspace
│       ├── settings/        ← Settings
│       ├── login/           ← Login
│       ├── register/        ← Register
│       └── projects/new/    ← New project
├── components/
│   ├── ui/                  ← komponen UI lokal (Radix primitives)
│   ├── studio/              ← Studio components
│   ├── settings/            ← Settings components
│   ├── auth/                ← Auth forms
│   ├── header.tsx           ← Navigation
│   ├── mobile-menu.tsx      ← Mobile nav
│   ├── project-list.tsx     ← Dashboard grid
│   ├── theme-provider.tsx   ← Theme context
│   ├── theme-toggle.tsx     ← Dark/light toggle
│   └── locale-switcher.tsx  ← Language selector
├── dictionaries/            ← Translation files (en.json, id.json)
└── lib/
    └── i18n.ts              ← 2 locales: en, id
```
