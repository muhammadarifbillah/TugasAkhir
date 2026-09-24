# ShieldForge

ShieldForge adalah generator website berbasis AI dengan alur Secure SDLC lima tahap:

1. Analysis and Requirements
2. Design and Architecture
3. Secure Development
4. Security Testing and Audit
5. Handover and Deliverables

Setiap tahap menggunakan NIST SP 800-218 sebagai panduan, memetakan kontrol ke ISO 27001:2022 Annex A, dan menyimpan audit trail. Laporan ISO yang dihasilkan bersifat konsep, bukan sertifikasi formal.

## Teknologi

- Next.js App Router dan React
- TypeScript
- PostgreSQL
- Prisma ORM 7 dengan `@prisma/adapter-pg`
- Auth.js dengan GitHub OAuth atau akun dev lokal
- Vercel AI SDK untuk provider AI
- `@react-pdf/renderer` untuk PDF
- Tailwind CSS dan komponen UI lokal

## Persiapan

Persyaratan:

- Node.js 20 atau lebih baru
- Docker Desktop
- PostgreSQL melalui container Docker
- API key AI jika ingin menjalankan chat AI nyata

Install dependensi:

```bash
npm install
```

Salin `.env.example` menjadi `.env`, lalu isi minimal:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/secure_sdlc?schema=public
AUTH_SECRET=replace-with-a-long-random-secret
ENCRYPTION_MASTER_KEY=replace-with-a-32-byte-hex-key
```

`ENCRYPTION_MASTER_KEY` wajib berupa kunci acak untuk lingkungan produksi. Jangan gunakan nilai placeholder.

### AI default (opsional, berguna untuk demo)

Tanpa konfigurasi BYOK di halaman Pengaturan, aplikasi memakai model default dari env:

```env
DEFAULT_AI_PROVIDER=gemini
DEFAULT_AI_MODEL=gemini-flash-latest
DEFAULT_AI_API_KEY=your-gemini-api-key
```

`DEFAULT_AI_API_KEY` hanya dibaca dari `.env` dan tidak pernah di-commit. Provider lain yang didukung: `openai`, `openrouter`, `anthropic`, `ollama` (tanpa key). Provider Gemini/OpenAI/OpenRouter memakai endpoint Chat Completions melalui `@ai-sdk/openai`.

Catatan: model Gemini lawas seperti `gemini-2.5-flash` sudah tidak tersedia untuk pengguna baru; gunakan alias `gemini-flash-latest` atau model yang tampil pada daftar model akunmu.

## Menjalankan Lokal

Jalankan database yang sudah dibuat:

```bash
docker start secure-sdlc-db
```

Jika container belum ada, buat dengan:

```bash
docker run --name secure-sdlc-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=secure_sdlc -p 5432:5432 -d postgres:16-alpine
```

Atau gunakan PostgreSQL lokal dengan `DATABASE_URL` yang sesuai.

Jalankan migrasi dan seed:

```bash
npm run db:migrate
npm run db:seed
```

Jalankan aplikasi:

```bash
npm run dev
```

Buka `http://localhost:3000`. Jika GitHub OAuth belum dikonfigurasi, gunakan akun dev lokal yang tersedia di halaman login saat mode development.

## GitHub OAuth dan Push

Untuk login GitHub, isi:

```env
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
```

Push ke GitHub dapat dilakukan dengan OAuth token tersimpan atau Personal Access Token dengan izin `repo`. Sistem mendukung:

- Membuat repository baru
- Push ke repository existing
- Membuat commit di atas branch default existing
- Membuat release branch dan Pull Request untuk revisi

Token disimpan terenkripsi AES-256-GCM dan tidak dikirim kembali ke browser.

## Bahasa dan Output AI

Antarmuka mendukung Bahasa Inggris dan Bahasa Indonesia. Bahasa dipilih melalui switcher dan disimpan pada cookie `NEXT_LOCALE`.

Bahasa output AI dan dokumentasi dipilih saat membuat proyek melalui `outputLanguage`.

## Endpoint Utama

- `POST /api/projects` membuat proyek baru (dengan rekomendasi stack otomatis di latar belakang)
- `POST /api/chat` menjalankan prompt pada tahap aktif
- `POST /api/chat/reparse` mem-parse ulang JSON dari respons AI terakhir (pemulihan saat model tidak mengembalikan JSON)
- `POST /api/artifacts/apply` menerapkan perbaikan satu file hasil "Apply" pada diff
- `PATCH /api/projects/:id` memperbarui proyek (mis. toggle `badgePublic`)
- `POST /api/stages/complete` menyelesaikan tahap — hanya jika kriteria selesai tahap terpenuhi dan semua tahap sebelumnya selesai
- `POST /api/github/push` push source code ke GitHub
- `POST /api/revisions` membuat revisi baru (hanya untuk proyek `completed`)
- `PATCH /api/revisions/:id` merge atau cancel revisi
- `GET /api/export/doc` mengunduh Manual Book atau laporan ISO PDF/Markdown (hanya jika semua tahap selesai)
- `GET /api/export/doc?type=traceability` mengunduh matriks ketertelusuran requirement → NIST/ISO → file (Markdown)
- `GET /api/export/zip` mengunduh source bundle
- `GET /api/export/artifacts` mengunduh code artifacts antar-tahap
- `GET /api/badge/:projectId` badge publik — hanya untuk proyek `completed` **dengan opt-in `badgePublic`**
- `PATCH /api/projects/:id/artifacts` menyimpan hasil edit kode + snapshot
- `POST /api/projects/:id/snapshots/:snapshotId/restore` memulihkan source dari snapshot
- `POST /api/projects/:id/design/generate` menghasilkan mockup UI (HTML) dari prompt
- `PATCH /api/projects/:id/design` menyimpan desain (`designScreens` / `designFrames`)
- `PATCH /api/projects/:id/finalize` menandai proyek "fix"
- `POST` / `DELETE /api/projects/:id/database` membuat / menghapus database persisten
- `POST` / `DELETE /api/run/:projectId` menjalankan / menghentikan app hasil generate di Docker
- `GET /api/run/:projectId/status` status + statistik container
- `GET /api/run/:projectId/logs/stream` log container (SSE)
- `POST /api/projects/:id/scan` menjalankan pemindaian keamanan nyata (Semgrep SAST + Trivy vulnerability/secret/misconfig + audit dependency) di container Docker, menyimpan temuan dan skor keamanan deterministik
- `GET /api/projects/:id/scan` temuan pemindaian terakhir + ringkasan

## Editor, Run, Desain, dan Database

- **Editor kode editable** — panel kode studio memakai Monaco **self-hosted** (tanpa CDN); bisa diedit dan disimpan per file atau **Save All**, tiap simpan membuat snapshot.
- **Snapshot restore** — kembalikan source ke versi sebelumnya dari daftar Versions.
- **Run app (Docker sandbox)** — jalankan hasil generate multi-stack (Node/Next, Python, PHP, Go, static) di container dengan limit resource; preview di popup gaya VS Code (Desktop/Tablet/Mobile), log live (SSE), statistik CPU/RAM.
- **Database** — DB throwaway saat Run; DB persisten setelah proyek ditandai "Fix" (connection string terenkripsi).
- **Design Studio (ala Google Stitch)** — popup generator UI berbasis prompt: jelaskan layar → AI menghasilkan mockup HTML high-fidelity (statis, dirender di iframe sandbox) → **Refine** dengan prompt lanjutan → **Keep** untuk menyimpan. Desain terpilih menjadi acuan tahap Development.
- **ERD berkardinalitas** — relasi 1:1 / 1:N / M:N.
- **Security scanning nyata** — tahap Testing dapat menjalankan Semgrep (SAST), Trivy (vulnerability/secret/misconfig), dan audit dependency di container; temuan dipetakan ke NIST/ISO dan **security score dihitung deterministik** (bukan estimasi AI).
- **Traceability requirement → kode** — requirement keamanan ber-ID (`REQ-SEC-*`) dilacak ke rekomendasi, file kode, NIST dan ISO; diekspor sebagai `docs/TRACEABILITY-MATRIX.md`.
- **Audit log** di `/settings/audit` dan **manajemen database** di `/settings/databases`.
- **Tema & PWA** — light/dark, motif CSS ringan, manifest + service worker.

### Menjalankan app hasil generate
1. Buka tahap **Development** → klik **Run**. Container akan `install` lalu `start`.
2. Preview muncul di popup; log live di panel Terminal; kontrol ukuran perangkat tersedia.
3. Menutup popup menghentikan container (juga auto-stop setelah 15 menit idle).

## Verifikasi

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Smoke test manual mencakup pergantian bahasa, parameter keamanan per tahap, export PDF/Markdown/ZIP, badge, revisi, audit log, dan halaman BYOK.

## Catatan Produksi

- Rate limiter saat ini berbasis memori proses tunggal. Untuk deployment multi-instance, pindahkan bucket ke Redis atau penyimpanan bersama.
- Chat AI nyata membutuhkan provider dan API key yang valid.
- Provider login `dev` hanya terdaftar saat `NODE_ENV != production` atau GitHub OAuth belum dikonfigurasi.
- Badge hanya membuka metadata untuk proyek `completed` yang di-opt-in pemiliknya (`badgePublic`).
- IP audit hanya mempercayai `x-forwarded-for` saat `TRUSTED_PROXY=1`.
- Laporan ISO adalah crosswalk konseptual untuk kebutuhan pengembangan dan tugas akhir, bukan bukti sertifikasi.
- Fitur **Run** membutuhkan host dengan Docker daemon yang aktif (server ShieldForge sendiri; user akhir tidak perlu Docker bila di-host).
- Fitur **Run** dan **Security Scan** juga membutuhkan Docker; pada host tanpa Docker (mis. serverless), set `RUNNER_MODE=disabled` agar fitur dilewati dengan rapi.
- Security score berasal dari pemindai nyata (Semgrep/Trivy/audit). Bila Docker tidak tersedia, skor tetap menunggu pemindaian, bukan ditebak AI.
- Monaco dan font di-self-host: `scripts/copy-monaco.mjs` menyalin aset Monaco ke `public/monaco/vs` (dijalankan otomatis oleh `predev`/`prebuild`/`postinstall`).
- CSP memakai **nonce per-request** yang dibuat di `src/proxy.ts` (tanpa `'unsafe-inline'` untuk script).
