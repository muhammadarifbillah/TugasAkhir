# PRD — ShieldForge Landing Page Redesign ("Dark Clay")

| | |
|---|---|
| **Status** | Draft for review |
| **Date** | 25 Nov 2026 |
| **Owner** | ShieldForge (thesis project) |
| **Scope** | Public landing page `/[lang]` (ID/EN) + OG image. Studio, dashboard, and auth pages are **out of scope**. |
| **Visual references** | (1) "Innomax — Securing Your Organization's Digital Landscape" (dark navy, purple neon, giant spaced wordmark, 3D shield on a glowing platform, services grid, workflow, stats). (2) "PixelForge — Creative Web & UI/UX Designer" (dark, blue–purple gradient, 3D character in the hero, feature strip, skills grid, project cards, contact panel). |
| **Visual theme** | **Claymorphism** on a dark base ("Dark Clay"): soft, inflated 3D surfaces with inner and outer shadows, plus the neon glow from the references. |
| **Replaces** | The "Forge Ledger" landing (commits `03fd8b7`…`69c7cc7`). Its content, facts, and tests are reused. Only the visual layer and layout change. |

---

## 1. Background and problem

The current landing page is informative and accurate, but it uses a "technical document" style (hairlines, ledgers). The owner wants something more visually striking, modern, and "alive", closer to the two references: a dark cybersecurity look with neon glow and 3D objects. It should still explain ShieldForge in full and stay honest.

## 2. Goals

| # | Goal | Measure |
|---|---|---|
| G1 | First impression: modern, premium, "cyber security" | Owner approves the hero and 3 key sections on desktop before full build (review gate) |
| G2 | Informative: a visitor can explain what ShieldForge is, its 5 gates, how it works and what they get | All content blocks from §6 present in ID and EN |
| G3 | Honest and verifiable | 0 fake logos, clients, testimonials, awards or blog posts; every number comes from `landing-facts.ts` (existing tests) |
| G4 | Accessible and usable | Text contrast ≥ 4.5:1; keyboard and screen reader complete; reduced motion respected; no horizontal overflow at 375/768/1024/1440 |
| G5 | Fast | LCP ≤ 2.5 s on desktop broadband; hero art ≤ 250 KB (AVIF/WebP); no new JS dependencies |

## 3. Non-goals

- No redesign of studio, dashboard, settings, login or register.
- No new product features, backend changes or analytics.
- No contact form or newsletter backend. The page links to the existing flows ("Mulai proyek" → login or dashboard).
- No blog/CMS.

## 4. Constraints carried over (must hold)

1. **Honesty.** The references show "100K clients", partner logos, testimonials, awards and blog posts. ShieldForge has none of these, so each one is **replaced** by real equivalents (§6, "Reference section → ShieldForge section").
2. **Facts from code.** Counts and standard codes come from `src/lib/landing-facts.ts`:
   - `LANDING_FACTS` and `gateFacts()` for counts and sub-steps
   - `GATE_MAPPING` for the gate-level crosswalk; this is the original mapping from the seed, as the owner decided
   - `TEMPER`, `SCORE_WEIGHTS`
   The existing unit tests stay green.
3. **Wording.**
   - Use "Dipetakan ke / Mapped to" NIST SP 800-218 v1.1 and ISO/IEC 27001:2022 Annex A.
   - Never use "certified", "compliant" or "hardened".
4. **Motion rules.**
   - Landing motion runs on **desktop ≥1024px only** (existing `LandingMotion`).
   - Mobile is static.
   - Reduced motion drops movement and keeps opacity and colour.
5. **Tech.**
   - Next 16, React 19, Tailwind v4 and `motion`.
   - No GSAP, no Lenis.
   - Bilingual dictionaries keep identical keys.
   - Never `npm run build` in the main working copy.
6. **Glass vs clay.** The project bans `backdrop-blur` (decision "hapus-blur"). Claymorphism does not need blur, so the ban stays.

## 5. Users

| Persona | Need | What they look for on the page |
|---|---|---|
| Student / junior developer (primary) | Learn secure practice while building | What the 5 gates require, the 26 sub-steps, the glossary |
| Small team / SME (secondary) | A website with evidence of security | Deliverables, sandbox, score, GitHub |
| Lecturer / examiner | Judge rigour fast | Standards mapping, scoring method, limits, real screenshots |

---

## 6. Content and information architecture

The section order follows the references' rhythm. Each reference section is mapped to an honest ShieldForge equivalent.

| # | Reference section (Innomax / PixelForge) | ShieldForge section | Content (reuses existing dictionary keys where they exist) |
|---|---|---|---|
| 1 | Hero: giant spaced wordmark "SECURING" + 3D shield on a platform / 3D character | **Hero** | Giant spaced wordmark **"AMANKAN"** / **"SECURE"** (decorative, `aria-hidden`), the real H1 "Setiap tahap diperiksa sebelum kode dikirim." (`headline`), lede (`heroLede`), primary CTA (`ctaPrimary`/`ctaDashboard`), secondary CTA (`ctaGates`). Visual: a **clay 3D shield on a forge platform** with a neon ring and five temper-coloured rings (generated art, §8.4). |
| 2 | Partner-logo strip / feature strip (Modern UI, Clean Code…) | **Standards & tools strip** | Text badges, not logos: "NIST SP 800-218 v1.1 · ISO/IEC 27001:2022 · OWASP Top 10 · Semgrep · Trivy · Docker". Label "Dipetakan ke & diperiksa dengan" ("Mapped to & checked with"). No claim of partnership. |
| 3 | "Our Recent SEO Work" 6-card services grid with a centre orb / Skills grid | **What ShieldForge guards** | 6 clay cards: Requirements & data classification · Design & STRIDE threat model · Secure code (auth, anti-injection, secrets) · Scanning (Semgrep + Trivy) · Deterministic score · Export & GitHub. Each card has 3–4 bullets drawn from the existing copy (`aboutGate`, `featureGroups`, `archNodes`). The centre orb is the hero shield motif. |
| 4 | "Trusted Cybersecurity Solutions Over 35 Years" + "120+ team" stat card + portrait | **What is ShieldForge** + facts card | `aboutTitle`/`aboutLede`, AI-vs-gates list (`aboutAi`, `aboutGate`). The stat card shows real facts (`LANDING_FACTS`: 5 stages, 42 NIST tasks, 26 sub-steps, 6 AI providers, 2 languages). The portrait is replaced by the **studio screenshot** (`/landing/studio-workspace.jpg`) in a clay device frame. |
| 5 | "Our Security Workflow" circular diagram | **Five gates workflow** | 5 clay "temper coupons" in a ring or arc around the shield, each with its hallmark, temperature, gate name and mapping (`GATE_MAPPING`). Selecting one shows why, artefact and NIST/ISO. The 26 sub-steps sit in a disclosure below (existing `SubStepsDisclosure`, restyled). Desktop auto-advance with pause (existing behaviour). |
| 6 | "Serving Diverse Industries" tiles | **Who it is for** | 3 clay tiles: Students & junior developers · Small teams & SMEs · Lecturers (`aboutFor`). |
| 7 | "Our Amazing Customers" testimonial carousel / Featured Projects cards | **Inside the studio** | 3 project-style clay cards with the real screenshots (`previewShots`), each with a caption and tags (e.g. "Score", "NIST → ISO"). No testimonials. |
| 8 | "Awards and Recognition" | **How it works** | The 6-step flow (`how`) as a horizontal clay stepper, with the live vignette (existing `HowItWorks`, restyled). Scan example computed by `computeSecurityScore` (91). |
| 9 | (extra; supports trust) | **Behind the scenes** | 6-node architecture (`archNodes`) as clay nodes connected by neon lines, with notes, and the platform security list (`archPlatform`). |
| 10 | (extra; supports rigour) | **Evidence** | Score formula (`proofFormula`), gate → NIST/ISO table (`GATE_MAPPING`), CSV download of the 26 sub-steps (existing). |
| 11 | "Read Our Latest Blog" | **Learn** | Glossary (9 terms) as clay cards plus the FAQ (7 items) accordion. |
| 12 | "Let's Start" contact panel / Contact Me form | **Start** CTA panel | Large clay panel with neon edge: `closingTitle`, `closingLede`, primary CTA and "See the five gates". No form. |
| — | Footer | Footer (existing component, unchanged) | — |

Also kept from Forge Ledger:
- Problem statement with the Veracode figure (`problemStat`, 45% of tests, cited and dated). It is placed as a short band between sections 3 and 4.
- Deliverables and limits (`deliverables`, `limits`) as two clay columns after "Evidence".

New copy (ID + EN) needed:
- `heroWordmark`: "AMANKAN" / "SECURE"
- `stripLabel`
- `guardTitle` + `guardCards[6].{title, bullets[]}`
- `workflowTitle`
- `forTitle`
- `studioTitle`
- `learnTitle`

These are written during implementation, in the same voice rules as the existing copy.

---

## 7. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR1 | All 12 sections in §6 render in ID and EN with identical dictionary keys | Must |
| FR2 | Hero CTA goes to `/[lang]/login`, or `/[lang]/dashboard` when signed in. The secondary CTA scrolls to the workflow section. | Must |
| FR3 | Workflow: 5 selectable coupons (tabs) with keyboard (←/→/Home/End), swipe and buttons; desktop auto-advance 4.5 s with a pause control; pause on hover, focus, offscreen and hidden tab | Must |
| FR4 | 26 sub-steps available in native `<details>` with NIST/ISO per sub-step (from `STAGE_DEFINITIONS`) | Must |
| FR5 | CSV download of the 26 sub-steps (existing `buildMatrixCsv`) | Must |
| FR6 | Architecture nodes selectable (click/focus) with the note shown; on mobile all notes are listed | Must |
| FR7 | Gate-level mapping uses `GATE_MAPPING` (original seed crosswalk) everywhere it is shown | Must |
| FR8 | Numbers shown only from `LANDING_FACTS` / `computeSecurityScore` | Must |
| FR9 | Theme: dark clay is the default look of the landing. The light theme gets a light-clay variant with the same layout. | Must |
| FR10 | OG image updated to the Dark Clay hero | Should |
| FR11 | Header on the landing uses the existing header; it may get a dark translucent-free solid background matching the landing | Could |

## 8. Design requirements

### 8.1 Design principles
1. **One hero object.** The clay shield on the forge platform is the memorable element, as the shield is in the Innomax reference.
2. **Clay for objects, flat for reading.** Cards, coupons, buttons, nodes and panels are clay. Long text sits on calm surfaces.
3. **Neon only as light.** Glow marks focus, the selected state and the hero. It is never used for body text.
4. **Temper colours stay as identity.** The 5 gates keep straw, bronze, violet, blue and grey, with hallmark shapes (◇ ○ △ □ ⬡), so identity is never colour alone.

### 8.2 Colour (Dark Clay)

| Token (landing-scoped) | Value | Use |
|---|---|---|
| `--clay-bg` | `#0b0d1a` | page background (deep navy, like the references) |
| `--clay-bg-2` | `#11142a` | alternating section band |
| `--clay-surface` | `#1a1e3a` | clay card base |
| `--clay-surface-hi` | `#252a52` | clay highlight (top-left) |
| `--clay-ink` | `#eef0ff` | primary text (≥ 12:1 on bg) |
| `--clay-muted` | `#a6abd6` | secondary text (target ≥ 7:1 on bg; verify) |
| `--clay-violet` | `#8b5cf6` | primary accent / CTA (with white text, ≥ 4.5:1 verified in implementation) |
| `--clay-blue` | `#3b82f6` | secondary accent / links |
| `--clay-glow` | `rgba(139,92,246,.55)` | neon glow |
| stage 1–5 | dark-theme stage tokens (existing) | gate identity on dark |

The light-clay variant (FR9) uses:
- page `#eef0fb`
- surface `#f7f8ff`
- ink `#15191e`
- violet `#6d4fd8` (verify AA)

Contrast for every text pair is enforced by extending `src/lib/contrast.test.ts`.

### 8.3 Claymorphism spec

| Element | Radius | Surface | Shadow (dark) |
|---|---|---|---|
| Clay card | 24px | `linear-gradient(145deg, --clay-surface-hi, --clay-surface)` | outer `12px 12px 28px rgba(0,0,0,.55)`, `-8px -8px 20px rgba(120,110,255,.06)`; inner `inset 2px 2px 4px rgba(255,255,255,.08)`, `inset -4px -6px 12px rgba(0,0,0,.35)` |
| Clay button (primary) | 999px | violet gradient `#9b6dff → #7046f0` | outer `0 8px 24px var(--clay-glow)`; inner highlight `inset 0 2px 0 rgba(255,255,255,.35)`; pressed: `translateY(1px)`, smaller glow, 150 ms |
| Clay coupon (gate) | 20px | surface + 10% stage tint | as the card; selected: 2px stage-colour ring + stage glow |
| Clay node (architecture) | 18px | surface | as the card, smaller |
| Clay panel (CTA) | 32px | surface + violet edge gradient | card shadow + `0 0 60px var(--clay-glow)` |
| Clay chip / badge | 999px | `--clay-surface-hi` | `inset 0 1px 0 rgba(255,255,255,.08)` |

Rules:
- Borders at 1px `rgba(255,255,255,.06)` are allowed on dark so edges read on projectors.
- No blur filters on content.
- High-contrast mode: shadows off, 2px solid borders.

### 8.4 Typography
- Keep **Archivo** (variable width), already self-hosted.
- Hero wordmark: Archivo width 125%, weight 800, uppercase, `letter-spacing: .18em`, filled with a vertical gradient (`#ffffff → #b9a8ff`), size `clamp(4rem, 12vw, 10rem)`, `aria-hidden`. It is the giant "SECURING" treatment from the reference.
- H1 (real headline) 40–56px, H2 32–44px, body 16/26, small 14/22.
- Mono (Geist Mono) for codes only.

### 8.5 Imagery (generated + real)

| Asset | Description | Source | Format / budget |
|---|---|---|---|
| Hero art | Glossy clay-style 3D shield with a keyhole/check mark, standing on a round forge platform with concentric neon violet rings and five thin rings in the temper colours (straw, bronze, violet, blue, grey); dark navy background with soft starfield; no text | Generated with the image tool, curated by the owner | AVIF + WebP, 1600×1200, ≤ 250 KB, `priority` |
| Section orb (guards grid centre) | Smaller clay shield emblem with a violet glow | Generated | WebP ≤ 60 KB |
| Studio frames | Existing real screenshots in clay device frames | `public/landing/*.jpg` | existing |
| Background | CSS radial gradients (violet/blue) + a subtle dot or grid pattern via CSS; no video | CSS | 0 KB |

All decorative art gets `alt=""`. Meaningful screenshots keep their descriptive alt text.

### 8.6 Layout
- Container `max-w-7xl px-4`; sections `py-24 md:py-32`; centred section headings (as in both references) with a small pill label.
- The pill label is real text such as "Alur kerja" or "Workflow". It is kept because both references use it, but it must name the section's content.
- Hero: centred wordmark at the top, hero art below it, and the headline, lede and CTAs overlapping the bottom of the art. Same composition as Innomax.
- Grids:
  - guards: 3×2 cards on lg with a centre orb, 2 columns on md, 1 on mobile
  - workflow: coupons in an arc around the shield on lg, a 5-column row on md, a vertical list on mobile
  - studio: 3 cards
  - learn: glossary 3 columns plus the FAQ

## 9. Motion requirements (desktop ≥1024px only)

| # | Element | Trigger | Motion | Reduced motion | Mobile |
|---|---|---|---|---|---|
| M1 | Hero art | Load | fades in and rises 24px (600 ms); platform rings pulse once (scale 0.96→1, glow in) | fade only | static |
| M2 | Hero art idle | While hero visible | very slow float (y ±6px, 6 s) and ring glow breathing; **pauses offscreen**; one subtle loop only | off | off |
| M3 | Wordmark | Load | letters fade in with 30 ms stagger (CSS, visible before hydration) | fade | static |
| M4 | Clay cards | Hover/focus | lift 4px, shadow deepens, glow edge (200 ms) | shadow/colour only | tap state only |
| M5 | Clay buttons | Press | squash (`translateY(1px)`, `scale .98`), 150 ms | colour only | press colour |
| M6 | Workflow coupons | In view | auto-advance 4.5 s with progress ring; selected coupon gets a stage glow; panel crossfade | crossfade, pause button | manual |
| M7 | Facts card | First in view | count-up (existing `CountUp`) | kept | final value |
| M8 | Architecture | Click/focus | node glow + neon connector fades in | same | static list |
| M9 | CTA panel | First in view | edge glow sweeps once (2 s) | off | static |

**Budget:** at most 1 continuous effect on screen (M2, hero only, paused offscreen). There is no section fade-up on every block, only M1, M3 and M9 as entrances. No scroll-linked animation. All of this implements the ui-ux-pro-max rule "1–2 animated elements per view".

## 10. Accessibility requirements
- All text pairs ≥ 4.5:1 (large text ≥ 3:1); UI component boundaries ≥ 3:1, so the clay edge border is required on dark.
- Focus ring: 2px `--clay-blue` + 2px offset, visible on every interactive clay element.
- Auto-advancing workflow: pause control, and it stops on focus and hover (WCAG 2.2.2).
- Decorative wordmark and art are `aria-hidden` / `alt=""`; the real H1 stays text.
- Touch targets ≥ 44px; no hover-only content.
- `prefers-reduced-motion` and the high-contrast toggle are honoured (§8.3, §9).

## 11. Performance requirements
- No new npm dependencies.
- Hero art in AVIF/WebP with `next/image` `priority` and explicit size; LCP ≤ 2.5 s on desktop.
- Shadows and gradients are CSS only. Glow uses `box-shadow`, not `filter: blur` on large areas.
- Idle animation (M2) uses transform/opacity only and pauses offscreen.

## 12. Acceptance criteria
1. FR1–FR9 met; ID and EN complete; `npm run check:dictionaries` OK.
2. No fake social proof anywhere (manual review against §6).
3. Gate mapping on the page equals `GATE_MAPPING` (unit test exists); all numbers come from `landing-facts.ts`.
4. Contrast test extended to Dark Clay and Light Clay text pairs and passing.
5. `npm run verify` green.
6. Playwright: 2 languages × 2 themes × 375/768/1024/1440 have no overflow and no new console errors; reduced motion has no transforms; mobile is static.
7. Owner sign-off on the hero and the guards and workflow sections (review gate after milestone M2).

## 13. Milestones

| Milestone | Deliverable | Review |
|---|---|---|
| M1 | Clay tokens + components (card, button, coupon, node, panel, chip) + contrast tests | Storybook-free: a temporary `/[lang]/clay-preview` page is **not** created; screenshots are reviewed instead |
| M2 | Hero (wordmark + generated art + CTAs) + standards strip + "What ShieldForge guards" | **Owner review gate** |
| M3 | What is / facts card · Five gates workflow (+ 26 sub-steps) · Who it is for · Inside the studio | screenshots |
| M4 | How it works · Behind the scenes · Evidence (+ CSV) · Deliverables & limits · Learn (glossary + FAQ) · Start panel | screenshots |
| M5 | Light-clay variant, OG image, docs (`DESIGN-BLUEPRINT.md` §2.1/§7, audit rows), verification pass | final review |

## 14. Risks

| Risk | Mitigation |
|---|---|
| Dark theme on a projector (thesis defence) washes out | Light-clay variant via the existing theme toggle; test both on a projector before the defence |
| Claymorphism reads "childish" (its usual domain) | Dark base, restrained radius on text surfaces, neon accents from the references keep it "cyber"; owner review at M2 |
| Generated hero art looks generic or wrong (text artefacts, extra shapes) | Prompt pins "no text"; generate 3 variants; owner picks; keep a CSS/SVG fallback shield |
| Neon glow lowers contrast | Glow never behind body text; contrast tests |
| Loss of the current "Forge Ledger" identity | Temper colours, hallmarks, facts and copy carry over; Forge Ledger stays in git history (`69c7cc7`) |

## 15. Open questions for the owner
1. **Default look:** should the landing always be dark (as in the references) regardless of the app theme, or follow the theme toggle with the light-clay variant? Proposed: follow the toggle, dark by default on the landing.
2. **Accent colour:** violet `#8b5cf6` (references) instead of the app's assay blue `#2f5e9e` on the landing only. OK?
3. **Hero art:** generate the clay shield with the image tool (3 variants for you to pick), or provide your own 3D asset?
4. **Hero wordmark:** "AMANKAN" / "SECURE", or the brand "SHIELDFORGE"?
