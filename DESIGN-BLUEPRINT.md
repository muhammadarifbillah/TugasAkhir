# ShieldForge Design Blueprint

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
| `md:text-5xl` | 48px | Hero title (desktop) |

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

```
┌─────────────────────────────────────────────────────────┐
│ HEADER: Logo | Dashboard | Settings     [Lang] [Theme] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              🛡️ ShieldForge                              │
│   AI-Powered Secure Development Lifecycle Generator     │
│                                                         │
│   [Start a project]  [See the control mapping]          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔄 5-Stage Secure SDLC       🔒 ISO 27001 Crosswalk    │
│  🔑 Bring Your Own Key        🐙 GitHub Native          │
│  💬 Prompt-Driven             🛡️ Secure by Design      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ FOOTER: ShieldForge — AI-powered secure website generator. NIST SP 800-218 engine · ISO 27001:2022 crosswalk (concept). │
└─────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Container: `max-w-6xl px-4 py-14 md:py-20`
- Hero: rata kiri di grid, H1 `text-4xl md:text-5xl` dengan kelas `display-type`
- CTA: dua `Button size="lg"` tanpa ikon: "Start a project" dan "See the control mapping"
- Features: enam butir daftar ber-ikon (bukan kartu), `grid gap-x-12 gap-y-7 sm:grid-cols-2`

### 2.2 Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ HEADER: Logo | Dashboard | Settings     [Lang] [Theme] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  My Projects                    [+ New Project]         │
│  Manage your Secure SDLC projects                      │
│                                                         │
│  🔍 Search...                                           │
│  [All] [In Progress] [Completed] [In Revision]          │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Project A   │ │ Project B   │ │ Project C   │      │
│  │ E-commerce  │ │ SaaS App    │ │ REST API    │      │
│  │ [Active]    │ │ [Completed] │ │ [Active]    │      │
│  │             │ │             │ │             │      │
│  │ React+Node  │ │ Next.js     │ │ Express     │      │
│  │ Score: 72   │ │ Score: 95   │ │ Score: 45   │      │
│  │ ████░░░░░░  │ │ ██████████  │ │ ████░░░░░░  │      │
│  │             │ │             │ │             │      │
│  │ [Revise]    │ │ [Revise]    │ │ [Revise]    │      │
│  │ [Open]      │ │ [Open]      │ │ [Open]      │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Container: `max-w-7xl mx-auto px-4 py-8`
- Header: `mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`
- Search: `Input` dengan icon `pl-9`
- Filter: `Button size="sm"` chips
- Grid: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`
- Card: `transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/50`

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
│              🛡️ ShieldForge                              │
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
| `lg` | 1024px+ | Studio tiga kolom; daftar fitur landing tetap dua kolom |

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
                                  Menu tampil di sisi kanan, tanpa animasi slide
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
| Scroll story | `gsap` + `ScrollTrigger` (`components/landing/stage-scroll-story.tsx`), landing route only | Pinned five-stage story between the hero and the mapping table |

**Scroll story (GSAP):**
- Runs only when `(min-width: 1024px) and (prefers-reduced-motion: no-preference)` matches.
- Uses `scroller` = `<main id="main">` element (passed as an element, not a selector), `pinType: "transform"`, `scrub: 0.5`.
- Snaps one stage per scroll step (`inertia: false`).
- Everywhere else (mobile, tablet, reduced motion, no JS) the five panels render stacked and static.
- Panels are hidden with opacity only, so screen readers read all five; the mapping table stays as the text equivalent.
- `useGSAP` + `matchMedia` revert on unmount and on breakpoint change, so no pin spacer leaks to other pages.
- License: GSAP Standard "No Charge" License (Webflow), proprietary and free, not OSI open source. Use on our own site is a Permitted Use. GSAP must not power a no-code visual animation builder for users, and its copyright notices must stay intact.

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
- The landing hero demo cycles through the five stages, pauses offscreen and has a pause button (WCAG 2.2.2); landing sections reveal on scroll.

**Rules**
- Animate only `transform`, `opacity` and colour.
- Never put `layout`, `layoutId` or a transformed `m.*` on an ancestor of Monaco (`CodeWorkspace`, `MonacoDiff`, `RunWorkspace`), because it breaks cursor and click positions.
- `prefers-reduced-motion: reduce` removes all movement: a global CSS override, `MotionConfig reducedMotion="user"`, and view transitions set to `none`.
- No smooth-scroll library and no glassmorphism (`backdrop-blur`).

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
