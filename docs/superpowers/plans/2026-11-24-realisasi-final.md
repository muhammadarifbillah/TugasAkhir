# Realisasi Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup 57 klaim audit yang belum Terealisasi (keamanan dan aksesibilitas lewat kode, sisanya lewat dokumen) dan menampilkan tombol Jalankan di tahap Serah Terima.

**Architecture:** Logika baru yang bisa diuji diletakkan sebagai fungsi murni di `src/lib` (atau berkas `.ts` non-React) lalu dipanggil dari route/komponen yang ada. Tidak ada route halaman baru; `RunWorkspace` dipakai ulang. Dokumen diperbaiki dari bagian 5 `docs/audit/matriks-realisasi.md`.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Prisma (PostgreSQL), Zod 3.25, Vitest 3 (`environment: "node"`, `include: src/**/*.test.ts`, gaya `node:assert/strict`), PowerShell 5.1.

**Spec:** `docs/superpowers/specs/2026-11-24-realisasi-final-design.md`

## Global Constraints

- Jangan jalankan `npm run build` / `next build` di working copy ini selama `next dev` hidup (AGENTS.md). Verifikasi: `npx tsc --noEmit`, `npx vitest run <file>`, `npm run lint`.
- Perintah shell untuk Windows PowerShell 5.1; jangan pakai `grep`. Pakai `git grep` atau `Select-String`.
- `src/dictionaries/en.json` dan `id.json` wajib berkunci identik. Setiap kunci baru ditambahkan di keduanya.
- Audit log tidak boleh memuat email, password, atau API key.
- Commit lokal per task dengan Conventional Commits. Tidak ada `git push`.
- Sebelum migrasi Prisma (Task 4): hentikan `npm run dev`, karena query engine terkunci di Windows. Jalankan lagi setelahnya.
- Sebelum memulai: hentikan dan jalankan ulang `npm run dev`. Galat `Cannot find module '@floating-ui/react-dom'` adalah cache dev server yang basi dari insiden `node_modules`; paketnya sudah lengkap.

## Review Focus

- Body JSON rusak (`{bad`) atau bukan objek pada `/api/chat`, `/api/chat/plan`, `/api/keys`, `/api/projects` → 400 `{ error }`, bukan 500. Diuji di Task 3.
- Scanner dengan `--cap-drop ALL` di Docker Desktop Windows: Trivy menulis cache dan `pip install` berjalan sebagai root kontainer. Bila salah satu gagal, harus muncul di `toolsSkipped`, bukan hilang diam-diam. Diuji nyata di Task 8 butir #27.
- Tombol Jalankan di Serah Terima ketika proyek belum punya kode (`hasCode` false) tidak boleh tampil. Diuji di Task 1.
- `rovingIndex` dengan daftar 0 atau 1 elemen tidak boleh menghasilkan indeks invalid atau NaN. Diuji di Task 5.
- Registrasi gagal (email sudah ada, validasi gagal) tidak boleh menulis audit `REGISTER`. Ditegakkan di Task 4 Step 3.

---

### Task 1: Tombol Jalankan di tahap Serah Terima

**Files:**
- Modify: `src/lib/stages.ts` (tambah fungsi setelah `getStageDefinition`, sekitar baris 286)
- Modify: `src/components/studio/studio-workspace.tsx:1384`
- Test: `src/lib/stages.test.ts`

**Interfaces:**
- Produces: `canRunApp(stageCode: string, hasCode: boolean): boolean` di `src/lib/stages.ts`

- [ ] **Step 1: Write the failing test** di `src/lib/stages.test.ts`

```ts
test("canRunApp allows running only in development and handover with code", () => {
  assert.equal(canRunApp("development", true), true);
  assert.equal(canRunApp("handover", true), true);
  assert.equal(canRunApp("handover", false), false);
  assert.equal(canRunApp("testing", true), false);
  assert.equal(canRunApp("analysis", true), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stages.test.ts`
Expected: FAIL, `canRunApp` is not exported

- [ ] **Step 3: Implement `canRunApp` in `src/lib/stages.ts`** lalu ganti kondisi `stage.code === "development" && hasCode` pada tombol `setShowRun(true)` di `studio-workspace.tsx:1384` dengan `canRunApp(stage.code, hasCode)`. Tombol "Tandai Fix" (`:1389`) tetap hanya di `development`.

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run src/lib/stages.test.ts; npx tsc --noEmit`
Expected: PASS, tsc exit 0

- [ ] **Step 5: Verifikasi manual** di `http://localhost:3000/id/studio/<projectId>/handover` untuk proyek yang punya kode: tombol **Jalankan** tampil di sebelah tab "Hasil & editor" dan membuka layar run (berkas, pratinjau, terminal, Hentikan). Klik **Hentikan** sebelum menutup.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stages.ts src/lib/stages.test.ts src/components/studio/studio-workspace.tsx
git commit -m "feat(studio): allow running the app from the handover stage"
```

### Task 2: Isolasi container scanner (#75)

**Files:**
- Modify: `src/lib/scanner/run.ts:56-149`
- Test: `src/lib/scanner/scanner.test.ts`

**Interfaces:**
- Produces: `export type ScannerTool = "semgrep" | "trivy" | "npm-audit" | "pip-audit"`, `export const SCANNER_HARDENING = ["--cap-drop", "ALL", "--security-opt", "no-new-privileges"] as const`, `export function scannerDockerArgs(tool: ScannerTool, dir: string): string[]`

- [ ] **Step 1: Write the failing test**

```ts
test("scannerDockerArgs hardens every scanner container", () => {
  for (const tool of ["semgrep", "trivy", "npm-audit", "pip-audit"] as const) {
    const args = scannerDockerArgs(tool, "/tmp/x");
    assert.deepEqual(args.slice(0, 2), ["run", "--rm"]);
    assert.deepEqual(args.slice(2, 6), [...SCANNER_HARDENING]);
    assert.ok(args.some((a) => a.startsWith("/tmp/x:")), `${tool} mounts the scan dir`);
  }
  assert.ok(scannerDockerArgs("semgrep", "/tmp/x").includes("p/owasp-top-ten"));
  assert.ok(scannerDockerArgs("trivy", "/tmp/x").includes("vuln,secret,misconfig"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/scanner/scanner.test.ts`
Expected: FAIL, `scannerDockerArgs` is not exported

- [ ] **Step 3: Implement `scannerDockerArgs`** dengan memindahkan keempat array argumen yang sekarang ada di `run.ts:64-79`, `:92-103`, `:117`, `:129-138` ke dalamnya tanpa mengubah isinya. Sisipkan `...SCANNER_HARDENING` tepat setelah `"--rm"`. Keempat pemanggilan `runTool` memakai `scannerDockerArgs(<tool>, dir)`.

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run src/lib/scanner/scanner.test.ts; npx tsc --noEmit`
Expected: PASS, tsc exit 0

- [ ] **Step 5: Commit**

```bash
git add src/lib/scanner/run.ts src/lib/scanner/scanner.test.ts
git commit -m "fix(scanner): drop capabilities and block privilege escalation in scanner containers"
```

### Task 3: Validasi Zod untuk route yang menerima body (#80)

**Files:**
- Create: `src/lib/api-schemas.ts`
- Test: `src/lib/api-schemas.test.ts`
- Modify: `src/app/api/chat/route.ts:30-42`, `src/app/api/chat/plan/route.ts:21-33`, `src/app/api/keys/route.ts:22-30`, `src/app/api/projects/route.ts:30-42`

**Interfaces:**
- Produces (`src/lib/api-schemas.ts`):
  - `chatPromptSchema`: `{ projectId?: string; projectStageId: string; prompt: string }`, dengan `prompt` 1-8000 karakter dan tidak kosong setelah trim; nilai `prompt` tidak diubah.
  - `createKeySchema`: `{ providerCode: string; apiKey: string; label?: string }`, `providerCode` dan `apiKey` minimal 1 karakter.
  - `createProjectSchema`: `{ name: string; description?: string; template?: string; scopeRequirements?: string; uiPreferences?: string; outputLanguage?: string }`, `name` di-trim lalu 1-120 karakter.
  - `parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: Response }>`. JSON rusak → `Response.json({ error: "Invalid JSON" }, { status: 400 })`. Skema gagal → `Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 })`.

- [ ] **Step 1: Write the failing tests**

```ts
const req = (body: string) => new Request("http://x/api", { method: "POST", body, headers: { "content-type": "application/json" } });

test("parseJsonBody rejects malformed JSON with 400", async () => {
  const r = await parseJsonBody(req("{bad"), chatPromptSchema);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.response.status, 400);
    assert.deepEqual(await r.response.json(), { error: "Invalid JSON" });
  }
});

test("chatPromptSchema rejects blank and oversized prompts", async () => {
  assert.equal((await parseJsonBody(req(JSON.stringify({ projectStageId: "s", prompt: "   " })), chatPromptSchema)).ok, false);
  assert.equal((await parseJsonBody(req(JSON.stringify({ projectStageId: "s", prompt: "a".repeat(8001) })), chatPromptSchema)).ok, false);
  const ok = await parseJsonBody(req(JSON.stringify({ projectStageId: "s", prompt: " hi " })), chatPromptSchema);
  assert.ok(ok.ok && ok.data.prompt === " hi ");
});

test("createKeySchema and createProjectSchema enforce required fields", async () => {
  assert.equal((await parseJsonBody(req(JSON.stringify({ providerCode: "openai" })), createKeySchema)).ok, false);
  assert.equal((await parseJsonBody(req(JSON.stringify({ name: "   " })), createProjectSchema)).ok, false);
  assert.equal((await parseJsonBody(req(JSON.stringify({ name: "x".repeat(121) })), createProjectSchema)).ok, false);
  assert.equal((await parseJsonBody(req("[]"), createProjectSchema)).ok, false);
  const p = await parseJsonBody(req(JSON.stringify({ name: "  Toko  " })), createProjectSchema);
  assert.ok(p.ok && p.data.name === "Toko");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api-schemas.test.ts`
Expected: FAIL, module not found

- [ ] **Step 3: Implement `src/lib/api-schemas.ts`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/api-schemas.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire ke 4 route.** Ganti blok `const body = (await request.json()) as {...}` beserta pemeriksaan manual tepat di bawahnya dengan `const parsed = await parseJsonBody(request, <schema>); if (!parsed.ok) return parsed.response; const body = parsed.data;`. Pertahankan logika setelahnya apa adanya: `slice` panjang, `ALLOWED_TEMPLATES`, `OUTPUT_LANGUAGES`, dan pencarian provider.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit; npm run lint`
Expected: exit 0 keduanya

- [ ] **Step 7: Commit**

```bash
git add src/lib/api-schemas.ts src/lib/api-schemas.test.ts src/app/api/chat/route.ts src/app/api/chat/plan/route.ts src/app/api/keys/route.ts src/app/api/projects/route.ts
git commit -m "fix(api): validate request bodies with zod and return 400 on malformed JSON"
```

### Task 4: Audit log untuk registrasi dan generate desain (#79b)

**Files:**
- Modify: `prisma/schema.prisma` (enum `AuditAction`, tambah `REGISTER` setelah `LOGOUT`)
- Create: `prisma/migrations/<timestamp>_add_register_audit_action/migration.sql` (dihasilkan Prisma)
- Modify: `src/app/api/auth/register/route.ts:54-68`
- Modify: `src/app/api/projects/[id]/design/generate/route.ts:~210-215`

**Interfaces:**
- Consumes: `writeAudit(userId, action, details?, ipAddress?)` dan `requestIp(request)` dari `src/lib/audit.ts`

- [ ] **Step 1: Hentikan `npm run dev`, tambah `REGISTER` ke enum, lalu buat migrasi**

Run: `npx prisma migrate dev --name add_register_audit_action`
Expected: migrasi baru berisi `ALTER TYPE "AuditAction" ADD VALUE 'REGISTER';`, dan Prisma Client ter-generate ulang

- [ ] **Step 2: Jalankan lagi `npm run dev`**

- [ ] **Step 3: Register.** Tepat setelah `prisma.user.create` berhasil dan sebelum `return`, panggil `await writeAudit(user.id, "REGISTER", { method: "credentials" }, requestIp(request));`. Jangan masukkan `email`, `name`, atau `password` ke `details`. Jalur 400, 409, dan 429 tidak menulis audit.

- [ ] **Step 4: Generate desain.** Sebelum `return NextResponse.json({ ok: true, screens, ... })` (sekitar `:215`), panggil `await writeAudit(session.user.id, "UPDATE_PROJECT", { projectId: <id proyek>, action: "generate_design", screens: screens.length }, requestIp(request));`. Pakai variabel id proyek yang sudah dipakai route itu.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 6: Verifikasi manual.** Daftar akun baru di `/id/register`, lalu buka `/id/settings/audit` dengan akun itu. Baris `REGISTER` muncul dan detailnya hanya `{"method":"credentials"}`. Generate satu desain di Design Studio, lalu pastikan baris `UPDATE_PROJECT` dengan `generate_design` muncul.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/api/auth/register/route.ts "src/app/api/projects/[id]/design/generate/route.ts"
git commit -m "feat(audit): record account registration and design generation"
```

### Task 5: Navigasi keyboard tab dan menu (#125)

**Files:**
- Modify: `src/components/studio/tab-key-nav.ts`
- Test: `src/components/studio/tab-key-nav.test.ts` (baru; cocok dengan `include: src/**/*.test.ts`)
- Modify: `src/components/studio/step-result-dialog.tsx:52`, `src/components/user-menu.tsx:76-79`, `src/components/studio/studio-workspace.tsx:1455-1459`

**Interfaces:**
- Produces: `export function rovingIndex(key: string, current: number, length: number): number`. Mengembalikan indeks tujuan untuk `ArrowRight`/`ArrowDown` (maju, melingkar), `ArrowLeft`/`ArrowUp` (mundur, melingkar), `Home` (0), dan `End` (length-1). Mengembalikan `-1` untuk tombol lain atau `length === 0`.
- Produces: `export function menuKeyNav(e: KeyboardEvent<HTMLElement>): void`. Memindahkan fokus di antara `[role="menuitem"]:not([disabled])` di dalam `e.currentTarget` memakai `rovingIndex` (Up/Down/Home/End saja), dan memanggil `e.preventDefault()` bila berpindah.
- `tabKeyNav` yang sudah ada dihitung ulang memakai `rovingIndex`; perilakunya tidak berubah.

- [ ] **Step 1: Write the failing test**

```ts
test("rovingIndex wraps and handles empty or single lists", () => {
  assert.equal(rovingIndex("ArrowDown", 2, 3), 0);
  assert.equal(rovingIndex("ArrowUp", 0, 3), 2);
  assert.equal(rovingIndex("ArrowRight", 0, 3), 1);
  assert.equal(rovingIndex("Home", 2, 3), 0);
  assert.equal(rovingIndex("End", 0, 3), 2);
  assert.equal(rovingIndex("ArrowDown", 0, 1), 0);
  assert.equal(rovingIndex("ArrowDown", 0, 0), -1);
  assert.equal(rovingIndex("Enter", 0, 3), -1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/studio/tab-key-nav.test.ts`
Expected: FAIL, `rovingIndex` is not exported

- [ ] **Step 3: Implement `rovingIndex` dan `menuKeyNav`, lalu ubah `tabKeyNav` agar memakai `rovingIndex`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/studio/tab-key-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Wire.**
  - `step-result-dialog.tsx:52`: tambah `onKeyDown={(e) => tabKeyNav(e, tabs.map((t) => t.id), activeTab, setActiveTab)}`.
  - Dua `role="menu"` (`user-menu.tsx:77`, `studio-workspace.tsx:1457`): tambah `onKeyDown={menuKeyNav}`, lalu fokuskan menuitem pertama saat menu terbuka. Di `user-menu.tsx`, ini berupa efek pada `open`. Di studio, berupa efek pada `moreOpen` lewat `moreMenuRef`. Penanganan Escape yang sudah ada tidak diubah.

- [ ] **Step 6: Typecheck + verifikasi manual**

Run: `npx tsc --noEmit`
Lalu, hanya dengan keyboard: buka menu pengguna, tekan panah bawah/atas (fokus berpindah dan melingkar), lalu Escape (menu tertutup). Lakukan hal yang sama untuk menu "..." di studio. Di dialog hasil sub-step, panah kiri/kanan berpindah antar-tab Ikhtisar, Visual, Data Mentah.

- [ ] **Step 7: Commit**

```bash
git add src/components/studio/tab-key-nav.ts src/components/studio/tab-key-nav.test.ts src/components/studio/step-result-dialog.tsx src/components/user-menu.tsx src/components/studio/studio-workspace.tsx
git commit -m "feat(a11y): arrow-key navigation for menus and the step result tabs"
```

### Task 6: Label tombol ikon dan peran dialog (#126b, #126c)

**Files:**
- Modify: `src/components/mobile-menu.tsx:71`, `src/components/settings/byok-manager.tsx:428,436,567,632,636`, `src/components/studio/studio-workspace.tsx:1413`
- Modify: `src/components/studio/design-studio-dialog.tsx:443-446`, `src/components/studio/fullscreen-viewer.tsx:105-107`, `src/components/studio/run-workspace.tsx:343-346`
- Modify (bila butuh kunci baru): `src/dictionaries/en.json`, `src/dictionaries/id.json`

- [ ] **Step 1: `aria-label` pada 7 tombol `size="icon"`.** Nilainya sama dengan `title` yang sudah ada bila ada (`byok-manager.tsx:428`, `:632`; `studio-workspace.tsx:1413`). Untuk yang lain: `:436` dan `:636` memakai teks hapus yang ada di `dict.settings`, `:567` memakai teks muat-ulang daftar model, `mobile-menu.tsx:71` memakai teks buka/tutup menu. Bila kuncinya belum ada, tambahkan di `en.json` dan `id.json` dengan nama yang sama.

- [ ] **Step 2: Peran dialog pada 3 popup layar penuh.** Pada `<div className="fixed inset-0 ...">` tambahkan `role="dialog" aria-modal="true" aria-labelledby={headingId}`. `headingId` berasal dari `useId()`, dan nilainya dipasang sebagai `id` pada `<h2>` judul di baris berikutnya.

- [ ] **Step 3: Verifikasi**

Run: `npx tsc --noEmit; npm run check:dictionaries; git diff --stat src/dictionaries`
Expected: tsc exit 0, kamus konsisten, dan diff kamus hanya berisi kunci baru dari Step 1.
Lalu di folder `src`, jalankan `Get-ChildItem src -Recurse -Include *.tsx | Select-String -Pattern 'size="icon"' -Context 0,6`. Setiap kecocokan harus memuat `aria-label` dalam 6 baris setelahnya.

- [ ] **Step 4: Commit**

```bash
git add src/components src/dictionaries
git commit -m "feat(a11y): label icon buttons and expose fullscreen overlays as dialogs"
```

### Task 7: Perbaiki dokumen proyek (kelompok B, C, dan sisi dokumen kelompok A)

**Files:**
- Modify: `README.md`, `teknologi-shieldforge.md`, `DESIGN-BLUEPRINT.md`

Sumber kebenaran: tabel bagian 5 di `docs/audit/matriks-realisasi.md`, kolom "Usulan teks jujur".

- [ ] **Step 1: README dan teknologi.** Terapkan setiap baris bagian 5 yang merujuk `README:` atau `teknologi:`. **Lewati** baris #75, #79b, dan #80, karena kodenya sudah dipenuhi di Task 2-4 dan kalimat aslinya kini benar. Untuk README L147-158 ("Editor, Run, ..."), tambahkan satu kalimat bahwa tombol Jalankan tersedia di tahap Pengembangan dan Serah Terima.

- [ ] **Step 2: DESIGN-BLUEPRINT.** Tulis ulang bagian 1 (Design System: font Archivo + Geist Mono, palet hex dari `src/app/globals.css`, radius `--radius: 0.5rem`, bayangan `--shadow-color`), bagian 2-4 (layout dan kelas sesuai kode), bagian 8 (aksesibilitas sesuai hasil Task 5-6), bagian 9 (`defaultTheme="light"`, `enableSystem`), dan bagian 10 (pohon berkas: `src/app/[lang]/layout.tsx`, `src/dictionaries`, 2 locale). Pakai kolom usulan bagian 5 untuk setiap baris blueprint. Baris #126b, #126c, dan #125 ditulis sesuai kode baru.

- [ ] **Step 3: Verifikasi**

Run: `Select-String -Path DESIGN-BLUEPRINT.md -Pattern 'OKLCH','Sans: Geist','4 locales','defaultTheme="dark"','border-blue-700','bg-emerald-600'`
Expected: 0 baris
Run: `Select-String -Path README.md,teknologi-shieldforge.md -Pattern '30\+ sub-step','deepseek-reasoner','Detail/update/delete'`
Expected: 0 baris

- [ ] **Step 4: Commit**

```bash
git add README.md teknologi-shieldforge.md DESIGN-BLUEPRINT.md
git commit -m "docs: align README, technology notes and design blueprint with the code"
```

### Task 8: Sesi uji runtime (kelompok D)

Dikerjakan oleh pemilik proyek, karena butuh kredensial nyata. Prasyarat: Docker Desktop menyala, satu token GitHub (OAuth login atau PAT dengan scope `repo`), satu API key provider AI, dan `npm run dev` hidup.

**Files:**
- Create: `docs/audit/verifikasi-runtime.md`

- [ ] **Step 1: Buat `docs/audit/verifikasi-runtime.md`** berisi tabel `| # | Klaim | Langkah | Hasil | Bukti |` dengan 9 baris: #13, #19, #24, #25, #27, #69a, #81b, #87b, #91b.

- [ ] **Step 2: Jalankan dan isi tiap baris.** Bukti berupa nama berkas tangkapan layar di `docs/audit/bukti/` atau cuplikan log.
  - #87b: kirim satu prompt di tahap Analisis; respons model muncul.
  - #24 dan #25: tahap Pengembangan, klik Jalankan; status mencapai **Siap**, pratinjau tampil, dan log terminal bergerak.
  - #91b: ulangi #24 dari tahap **Serah Terima** (Task 1).
  - #27: Keamanan & Kepatuhan, Jalankan pemindaian; Semgrep, Trivy, dan audit dependency tercatat di `toolsRun`. Bila ada yang masuk `toolsSkipped`, catat alasannya. Ini sekaligus menguji Task 2.
  - #19: unduh Manual Book dan laporan ISO; buka PDF, lalu pastikan tangga 5 warna dan margin A4 benar.
  - #13 dan #81b: push ke repo uji baru; buat revisi, lalu pastikan branch `release/...` dan Pull Request terbentuk.
  - #69a: buka daftar model OpenRouter di Pengaturan; catat jumlah model yang terbaca.

- [ ] **Step 3: Commit**

```bash
git add docs/audit/verifikasi-runtime.md docs/audit/bukti
git commit -m "docs(audit): record runtime verification of networked features"
```

### Task 9: Verifikasi akhir dan pembaruan matriks

**Files:**
- Modify: `docs/audit/matriks-realisasi.md`

- [ ] **Step 1: Jalankan seluruh pemeriksaan**

Run: `npm run verify`
Expected: exit 0. `check:dictionaries` boleh menulis ulang kamus; periksa `git diff --stat src/dictionaries`, dan bila hanya berubah format, commit bersama task ini.

- [ ] **Step 2: Perbarui matriks.** Ubah status #75, #79b, #80, #125, #126b, #126c menjadi `Terealisasi`, dengan bukti `path:baris` baru dari Task 2-6. Untuk 9 baris kelompok D, isi status dari hasil Task 8 (`Terealisasi` bila lulus; tetap `Tidak dapat diverifikasi` dengan alasan bila tidak dijalankan). Baris dokumen dari Task 7 menjadi `Terealisasi` bila kalimat dokumen kini cocok dengan kode. Hitung ulang tabel bagian 1.

- [ ] **Step 3: Commit**

```bash
git add docs/audit/matriks-realisasi.md src/dictionaries
git commit -m "docs(audit): update realisation matrix after fixes"
```
