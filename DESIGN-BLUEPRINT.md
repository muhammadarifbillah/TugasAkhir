# ShieldForge Design Blueprint

> Versi: 1.0 | Terakhir diperbarui: September 2026
> Tools: Next.js 16, Tailwind CSS v4, komponen UI lokal (Radix primitives), Geist Font

---

## 1. Design System

### 1.1 Color Palette (OKLCH)

#### Primary Colors

| Token | Light | Dark | Kegunaan |
|-------|-------|------|----------|
| `--primary` | `oklch(0.585 0.233 277.117)` | `oklch(0.704 0.19 256.87)` | Tombol aktif, link, brand |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | Teks di atas primary |
| `--background` | `oklch(0.985 0 0)` | `oklch(0.09 0.006 285.88)` | Background halaman |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Teks utama |

#### Semantic Colors

| Token | Light | Dark | Kegunaan |
|-------|-------|------|----------|
| `--success` | `oklch(0.596 0.145 163.225)` | `oklch(0.696 0.17 162.48)` | Selesai, aman, skor tinggi |
| `--warning` | `oklch(0.769 0.188 70.08)` | `oklch(0.837 0.128 66.29)` | Peringatan, skor sedang |
| `--danger` | `oklch(0.637 0.237 25.331)` | `oklch(0.704 0.191 22.216)` | Error, skor rendah |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Hapus, fatal |

#### Surface Colors

| Token | Light | Dark | Kegunaan |
|-------|-------|------|----------|
| `--card` | `oklch(1 0 0)` | `oklch(0.13 0.005 285.82)` | Background kartu |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Teks kartu |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.18 0.006 285.885)` | Background halus |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Teks sekunder |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 12%)` | Semua border |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.205 0 0)` | Hover background |

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
| `text-6xl` | 60px | Hero title (desktop) |

#### Font Families

```
Sans: Geist, ui-sans-serif, system-ui, sans-serif
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
| `rounded-md` | 8px | Tombol, input, card kecil |
| `rounded-lg` | 10px | Card, panel |
| `rounded-xl` | 14px | Dialog, modal |
| `rounded-full` | 9999px | Avatar, pill |

### 1.5 Shadow System

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

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
│   [Get Started]  [View on GitHub]                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 🔄 SDLC  │ │ 🔒 ISO   │ │ 🔑 BYOK  │               │
│  │ Workflow │ │ 27001    │ │ Keys     │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 🐙 GitHub│ │ 💬 AI    │ │ 🛡️ Secure│               │
│  │ Push     │ │ Prompts  │ │ Coding   │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ FOOTER: ShieldForge v1.0 — Built with Next.js 16        │
└─────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Container: `max-w-5xl mx-auto px-4 py-16 md:py-24`
- Hero: Centered text, H1 `text-4xl md:text-6xl font-bold`
- Badge: `rounded-full border bg-success/10 px-4 py-1.5 text-xs text-success`
- CTA: `Button size="lg"` dengan icon
- Features: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`

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
- Header: `flex justify-between items-center mb-6`
- Search: `Input` dengan icon `pl-9`
- Filter: `Button size="sm"` chips
- Grid: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`
- Card: `hover:border-primary/50 transition-colors`

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
│ [Navigate] [Chat] [Security]                    ← Mobile tabs  │
└─────────────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Container: `flex h-[calc(100svh-3.5rem)]`
- Grid: `grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12`
- Left: `lg:col-span-3` — Sub-steps + Deliverables
- Center: `lg:col-span-6` — AI Chat + Code Editor
- Right: `lg:col-span-3` — Security & Compliance
- Mobile: Tab switching (Navigate/Chat/Security)

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
│  │ 🐙 GitHub       │ │ 📊 Token Usage  │               │
│  │ Connected: @user│ │ Prompts: 1,234  │               │
│  │ [Disconnect]    │ │ Tokens: 45,678  │               │
│  └─────────────────┘ └─────────────────┘               │
│                                                         │
│  🔑 BYOK Manager                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ API Keys                                        │   │
│  │ [+ Add Key]                                     │   │
│  │ ┌───────────────────────────────────────────┐   │   │
│  │ │ Google AI | AIza...x9K | My Key | [Active]│   │   │
│  │ └───────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  │ AI Models                                       │   │
│  │ [+ Add Model]                                   │   │
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
│  │ Welcome back to ShieldForge                       │   │
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
│  │ [Sign in with GitHub]                            │   │
│  │                                                  │   │
│  │ Don't have an account? [Register]                │   │
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
Background: bg-background/80 backdrop-blur
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
│ 🔒 Score: 72/100                    │
│ ████████░░░░░░░░░░░░ (72%)          │
│                                     │
│ Stage: Analysis  [Revise] [Open]    │
└─────────────────────────────────────┘

Border: border rounded-lg
Hover: hover:border-primary/50
Padding: p-0 (CardHeader) + p-6 (CardContent)
```

### 3.3 Stage Stepper

```
┌─────────────────────────────────────────────────────────┐
│ [1] Analysis > [2] Design > [3] Dev > [4] Test > [5]   │
├─────────────────────────────────────────────────────────┤
│ States:                                                 │
│ - Active: bg-primary text-primary-foreground            │
│ - Completed: text-success + CheckCircle2 icon           │
│ - Locked: text-muted-foreground/50 + Lock icon          │
│ - Default: text-muted-foreground hover:bg-accent        │
│                                                         │
│ Scroll: overflow-x-auto scrollbar-none                  │
└─────────────────────────────────────────────────────────┘
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
Input: font-mono text-xs resize-none
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

Border: border-blue-700 bg-blue-950/50
Button: bg-emerald-600 hover:bg-emerald-500
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
Content: max-h-[60vh] overflow-y-auto p-4
```

### 3.7 Security Score Panel

```
┌─────────────────────────────────────┐
│ Security Score                      │
│ ┌─────────────────────────────────┐ │
│ │ Score: 72/100                   │ │
│ │ ████████░░░░░░░░░░░░ (72%)     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Stage Security Parameters           │
│ [PO.1.1] [PW.1.1] [PS.1.1]        │
│                                     │
│ NIST Checks                         │
│ ☑ PO.1.1 Define Security Req       │
│ ☑ PW.1.1 Design Review             │
│ ☐ PS.1.1 Secure Coding             │
│                                     │
│ ISO Mapping                         │
│ ☑ A.5.1.1 policies                 │
│ ☑ A.8.2.1 information classify     │
│ ☐ A.8.3.1 information access       │
└─────────────────────────────────────┘

Progress: color coded (green >=85, amber >=60, red <60)
```

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

Severity colors:
- critical: bg-red-900 text-red-300
- high: bg-orange-900 text-orange-300
- medium: bg-yellow-900 text-yellow-300
- low: bg-green-900 text-green-300
```

---

## 4. Responsive Behavior

### 4.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Default | <640px | Single column, mobile tabs |
| `sm` | 640px+ | 2-column grids |
| `md` | 768px+ | Desktop nav, 2-column layouts |
| `lg` | 1024px+ | 3-column studio, 3-column features |

### 4.2 Studio Workspace Responsive

```
Desktop (lg+):           Tablet (md):            Mobile (<md):
┌────┬────────┬────┐    ┌──────┬────────┐      ┌──────────┐
│Left│ Center │Rght│    │ Left │ Center │      │ [Navigate]│
│3/12│ 6/12   │3/12│    │2/6   │ 4/6    │      │ [Chat]    │
│    │        │    │    │      │        │      │ [Security] │
└────┴────────┴────┘    └──────┴────────┘      └──────────┘
                                              Content switches
                                              per active tab
```

### 4.3 Mobile Tab Bar

```
┌─────────────────────────────────────┐
│ [Navigate] [Chat] [Security]        │
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
                                  Menu slides from right
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
11. Toast: "Build complete! 3 files created"
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
3. API call to /api/chat
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
| `text-destructive` | Error, danger, low score |
| `text-muted-foreground` | Secondary, inactive |

---

## 7. Animation System

### 7.1 Transitions

```css
/* Standard transition */
transition-colors duration-200

/* Slide in for toasts */
@keyframes slide-in {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}

/* Spin for loaders */
animate-spin
```

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
- Escape closes dialogs
- Arrow keys navigate menus
- Ctrl+Enter sends chat

### 8.3 Screen Reader

- All icons have `aria-hidden="true"`
- Interactive elements have `aria-label`
- Dialogs have `aria-labelledby`
- Progress bars have `aria-valuenow`

---

## 9. Dark/Light Mode

### 9.1 Implementation

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
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
- OKLCH color space for better color perception

---

## 10. File Structure

```
src/
├── app/
│   ├── globals.css          ← Design tokens
│   ├── layout.tsx           ← Root layout
│   └── [lang]/
│       ├── layout.tsx       ← Lang layout
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
└── lib/
    ├── i18n.ts              ← 4 locales
    └── dictionaries/        ← Translation files
```
