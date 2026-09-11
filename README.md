# SecureSDLC

SecureSDLC adalah generator website berbasis AI dengan alur Secure SDLC lima tahap:

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
- `GET /api/export/zip` mengunduh source bundle
- `GET /api/export/artifacts` mengunduh code artifacts antar-tahap
- `GET /api/badge/:projectId` badge publik — hanya untuk proyek `completed` **dengan opt-in `badgePublic`**

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
