# ShieldForge

## AI-Powered Secure SDLC Generator

Dokumentasi Teknologi & Realisasi Fitur

Tugas Akhir - Sistem Informasi

---

## 1. Ringkasan Proyek

ShieldForge adalah aplikasi web yang membantu pengembang website membangun aplikasi web yang aman melalui panduan terstruktur 5 tahap Secure Software Development Lifecycle (Secure SDLC). Aplikasi ini menggunakan AI (Artificial Intelligence) untuk menganalisis kebutuhan proyek, memberikan rekomendasi arsitektur, menghasilkan source code yang aman, melakukan security testing, serta menyediakan deliverables yang siap deploy.

Pendekatan keamanan aplikasi ini berbasis pada dua standar internasional: NIST SP 800-218 (Secure Software Development Framework / SSDF v1.1) dan ISO/IEC 27001:2022 Annex A. Seluruh 42 task SSDF dipetakan ke kontrol Annex A; 29 di antaranya dihubungkan langsung ke lima tahap pengembangan.

Fitur pembeda: traceability requirement keamanan dari tahap analisis hingga kode implementasinya, serta security scanning nyata (bukan estimasi AI) menggunakan Semgrep, Trivy, dan audit dependency.

---

## 2. Teknologi yang Digunakan

### 2.1 Frontend

| Komponen | Teknologi | Versi | Fungsi |
|---|---|---|---|
| Framework | Next.js | 16.3.1 | React framework dengan App Router, Server Components, API Routes |
| UI Library | React | 19.2.8 | Library untuk membangun antarmuka pengguna |
| Bahasa | TypeScript | 5.x | JavaScript dengan type safety |
| CSS Framework | Tailwind CSS | 4.x | Utility-first CSS framework |
| UI Components | Radix UI | - | Komponen UI yang dapat diakses (accessible) |
| Code Editor | Monaco Editor self-hosted, dibungkus @monaco-editor/react 4.7.0 | 0.52.2 | Editor kode seperti VS Code di browser |
| Diagram | Mermaid.js | 11.16.1 | Rendering diagram arsitektur, ERD & flowchart |
| Icons | Lucide React | 1.31.0 | Ikon SVG yang konsisten |
| PWA | Service Worker + Manifest | - | Dapat dipasang (installable) dan dukungan offline |

### 2.2 Backend & API

| Komponen | Teknologi | Versi | Fungsi |
|---|---|---|---|
| API Framework | Next.js API Routes | 16.3.1 | 30+ REST API endpoint |
| Authentication | NextAuth.js | 5.0.0-beta.32 | OAuth (GitHub) + Email/Password + Dev Credentials |
| ORM | Prisma | 7.9.1 | Database access layer dengan type safety |
| Validation | Zod | 3.25.76 | Schema validation untuk input |
| CSRF Protection | Custom double-submit cookie | - | Keamanan cross-site request forgery |
| Rate Limiting | Custom in-memory | - | Pembatasan jumlah request per menit |
| Password Hashing | bcryptjs | 3.0.3 | Hashing password akun lokal |
| Enkripsi | Node.js crypto (AES-256-GCM) | - | Enkripsi API keys, token GitHub, koneksi database |

### 2.3 Database

| Komponen | Teknologi | Versi | Fungsi |
|---|---|---|---|
| Database | PostgreSQL | 16 | Relational database untuk semua data |
| Adapter | @prisma/adapter-pg | 7.9.1 | Prisma PostgreSQL driver adapter |
| Total Models | 21 model | - | User, Project, SecurityRequirement, SecurityFinding, dll. |
| Migrations | 12 migrasi | - | Schema versioning otomatis |

### 2.4 Integrasi AI

| Komponen | Teknologi | Versi | Fungsi |
|---|---|---|---|
| AI SDK | Vercel AI SDK | 7.0.65 | Interface seragam untuk multi-provider AI |
| Default Provider | Google Gemini (fallback OpenAI) | gemini-flash-latest | Default dari env; tanpa env, kode memakai OpenAI gpt-4o-mini |
| OpenAI | @ai-sdk/openai | 4.0.41 | GPT-4o, GPT-4o-mini (juga OpenAI-compatible) |
| Anthropic | @ai-sdk/anthropic | 4.0.38 | Claude 3.5 Sonnet |
| Local AI | ollama-ai-provider | 1.2.0 | Model lokal (offline) |
| OpenRouter | OpenRouter API | - | Akses 100+ model AI |
| DeepSeek | DeepSeek API | - | OpenAI-compatible; model default deepseek-flash, daftar lain diambil dari API DeepSeek |
| BYOK | Bring Your Own Key | - | Enam provider dengan kunci terenkripsi |

### 2.5 Keamanan & Pemindaian

| Komponen | Teknologi | Fungsi |
|---|---|---|
| SAST | Semgrep (Docker) | Analisis statis kode (ruleset OWASP Top 10 & security-audit) |
| Vulnerability/Secret/IaC | Trivy (Docker) | Deteksi kerentanan dependency, hardcoded secret, dan misconfiguration |
| Dependency Audit | npm audit / pip-audit | Audit dependency sesuai stack proyek hasil generate |
| Security Score | Formula deterministik | Skor 0-100 dari bobot temuan (critical/high/medium/low) |
| Sandbox | Docker (cap-drop ALL, no-new-privileges) | Isolasi eksekusi scanner dan aplikasi hasil generate |

### 2.6 Tools Pendukung

| Komponen | Teknologi | Versi | Fungsi |
|---|---|---|---|
| Export ZIP | JSZip | 3.10.1 | Kompresi source code ke file ZIP |
| PDF Export | React PDF Renderer | 4.6.0 | Generate dokumen PDF (manual, compliance) |
| GitHub Integration | Octokit | 5.0.5 | Push kode ke repository GitHub |
| Theme | next-themes | 0.4.6 | Dark/Light mode toggle |
| Testing | Vitest | 3.2.7 | Unit test (path validation, parser scanner, traceability) |

---

## 3. Arsitektur Sistem

ShieldForge dibangun dengan arsitektur monolith menggunakan Next.js App Router. Berikut alur data utama:

1. **Login** - NextAuth.js memvalidasi kredensial (GitHub OAuth / Email / Dev Account) dan membuat session JWT pada httpOnly cookie.
2. **Buat Proyek** - User mengisi nama, template, bahasa output. Sistem membuat 5 ProjectStage (satu per tahap SDLC) dan merekomendasikan stack teknologi via AI.
3. **Studio (Workspace)** - User memilih tahap; chat panel terbuka, code editor Monaco menampilkan artifact, dan panel Security & Compliance menampilkan kontrol NIST/ISO.
4. **Chat dengan AI** - AI engine menyusun system prompt + konteks proyek + riwayat chat, mengirim ke provider AI, lalu mem-parsing structured JSON (stage_result), menyimpan rekomendasi, snapshot, requirement, dan link traceability.
5. **Security Scan** - User menjalankan scanner pada tahap Testing; Semgrep, Trivy, dan audit dependency dieksekusi di container Docker; temuan disimpan dan skor dihitung deterministik.
6. **Selesaikan Tahap** - Sistem memvalidasi semua sub-step terpenuhi sebelum status tahap menjadi completed.
7. **Handover & Export** - Unduh ZIP, Manual Book (PDF/MD), Laporan Kepatuhan ISO (PDF/MD), Traceability Matrix (MD), atau push ke GitHub.

---

## 4. Fitur yang Direalisasikan

### 4.1 Lima Tahap Secure SDLC

| Tahap | Nama | Sub-Step | NIST Tasks |
|---|---|---|---|
| 1 | Analysis & Requirements | scope, stack, security, data, recommendations | PO.1.1, PO.1.2, PO.3.1, PO.4.1, PW.1.1 |
| 2 | Design & Architecture | ui, architecture, stride, diagram, schema, recommendations | PW.1.1, PW.1.2, PW.1.3, PW.2.1 |
| 3 | Secure Development | frontend, scaffold, auth, antiInjection, secrets, recommendations | PW.4.1, PW.4.2, PW.5.1, PW.6.1, PW.6.2, PS.1.1 |
| 4 | Security Testing & Audit | owasp, score, remediation, recommendations | PW.7.1, PW.7.2, PW.8.1, PW.8.2, RV.1.1, RV.1.2, RV.2.1, RV.2.2 |
| 5 | Handover & Deliverables | manual, compliance, checklist, export, recommendations | PW.9.1, PW.9.2, PS.2.1, PS.3.1, PS.3.2, RV.3.1, RV.3.4 |

### 4.2 REST API

| Grup | Endpoint | Fungsi |
|---|---|---|
| Auth | /api/auth/[...nextauth] | Login/Logout (GitHub OAuth + Email + Dev) |
| Auth | /api/auth/register | Registrasi akun lokal |
| Chat | /api/chat | Kirim prompt ke AI, terima analisis & rekomendasi |
| Chat | /api/chat/plan | Mode perencanaan (plan sebelum build) |
| Chat | /api/chat/build | Eksekusi plan yang disetujui |
| Chat | /api/chat/reparse | Parse ulang respons AI sebelumnya |
| Projects | /api/projects | Membuat proyek (POST) |
| Projects | /api/projects/[id] | Memperbarui proyek (PATCH) |
| Projects | /api/projects/[id]/artifacts | Simpan hasil edit kode + snapshot |
| Projects | /api/projects/[id]/snapshots/[snapshotId]/restore | Pulihkan source dari snapshot |
| Projects | /api/projects/[id]/design | Simpan desain (Design Studio) |
| Projects | /api/projects/[id]/design/generate | Generate mockup UI (HTML) dari prompt |
| Projects | /api/projects/[id]/finalize | Tandai proyek "fix" (membuka provisioning DB) |
| Projects | /api/projects/[id]/database | Buat/hapus database persisten |
| Projects | /api/projects/[id]/scan | Jalankan security scanner & ambil temuan |
| Stages | /api/stages/complete | Tandai tahap selesai (dengan validasi) |
| Keys | /api/keys, /api/keys/[id], /api/keys/test | Tambah, ubah, hapus kunci, dan tes koneksi API key (BYOK) |
| Models | /api/models, /api/models/[id], /api/models/list | Tambah, ubah, hapus model; daftar dibaca halaman Settings |
| Recommendations | /api/recommendations/[id] | Terapkan rekomendasi keamanan |
| Revisions | /api/revisions, /api/revisions/[id] | Revisi versi & merge/cancel |
| GitHub | /api/github/push, /api/user/github | Push kode & koneksi akun GitHub |
| Run | /api/run/[projectId], /status, /logs, /logs/stream | Jalankan/hentikan app hasil generate (Docker) |
| Export | /api/export/zip, /doc, /artifacts | Export ZIP, dokumen (PDF/MD), artifact |
| Artifacts | /api/artifacts/apply | Terapkan perbaikan satu file dari diff |
| Badge | /api/badge/[projectId] | Security badge SVG (opt-in) |

### 4.3 Fitur Keamanan

- **CSRF Protection** - Pola double-submit cookie dengan token Web Crypto API.
- **Rate Limiting** - In-memory rate limiter per endpoint (chat, project creation, scan, dll.).
- **AES-256-GCM Encryption** - API keys, token GitHub, dan connection string database dienkripsi sebelum disimpan.
- **Security Headers & CSP** - X-Frame-Options, X-Content-Type-Options, HSTS, CSP dengan nonce per-request (tanpa unsafe-inline untuk script), Referrer-Policy, Permissions-Policy.
- **Input Validation** - Validasi Zod di semua endpoint.
- **Prompt Sanitization** - Deteksi & penghapusan secret dari input user sebelum dikirim ke model.
- **Audit Logging** - Semua aksi penting (login, create project, complete stage, run app, scan, dll.) dicatat ke database.
- **Path Traversal Guard** - Validasi path artifact (ZIP-slip) pada export dan runner.

### 4.4 Fitur Tambahan

- **Multi-Bahasa (i18n)** - English dan Bahasa Indonesia.
- **Dark/Light Mode** - Theme toggle dengan next-themes.
- **BYOK** - Enam provider AI: OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Ollama.
- **Monaco Code Editor** - Editor kode seperti VS Code, self-hosted (tanpa CDN), mendukung Save/Save All + snapshot.
- **Design Studio** - Generator mockup UI berbasis prompt (high-fidelity HTML, refine, keep).
- **ERD & Diagram** - ERD berkardinalitas (1:1, 1:N, M:N), diagram arsitektur & auth flow.
- **Run App (Docker Sandbox)** - Jalankan hasil generate multi-stack (Node/Next, Python, PHP, Go, static) dengan limit resource, preview, dan log live (SSE).
- **Database Provisioning** - DB throwaway saat Run; DB persisten setelah proyek ditandai "Fix".
- **Revisi & Snapshot** - Riwayat versi, restore source, serta release branch + Pull Request.
- **Security Badge** - Badge SVG skor keamanan (opt-in).
- **PWA** - Manifest + service worker, banner offline.

### 4.5 Traceability Requirement ke Kode

- Setiap security requirement dari tahap Analysis diberi ID stabil (mis. `REQ-SEC-001`).
- Rekomendasi dan perbaikan pada tahap Development/Testing ditandai dengan `requirementIds`.
- Tabel `SecurityRequirement` dan `RequirementLink` menyimpan relasi requirement -> rekomendasi -> file kode.
- Status link diperbarui otomatis dari hasil pemindaian: **Verified** bila tidak ada temuan high/critical untuk task NIST terkait, atau **Issue** bila ditemukan.
- Hasilnya: **Traceability Matrix** (requirement -> NIST -> ISO -> file -> status Implemented/Partial/Gap/Issue), tampil di UI (panel di tahap Testing & Handover) dan diekspor sebagai `docs/TRACEABILITY-MATRIX.md`.

### 4.6 Security Scanning Nyata

- **Semgrep** (SAST) menjalankan ruleset `p/owasp-top-ten` dan `p/security-audit` pada source hasil generate.
- **Trivy** memindai kerentanan dependency, hardcoded secret, dan misconfiguration (Dockerfile/IaC).
- **Dependency audit** sesuai stack: `npm audit` (Node) atau `pip-audit` (Python).
- Temuan dinormalisasi (severity, file, line, CWE/OWASP), dipetakan ke NIST/ISO, dan menandai requirement terkait sebagai **Verified** (tanpa temuan high/critical) atau **Issue**.
- **Security Score** dihitung deterministik: mulai 100, dikurangi bobot per temuan (critical 20, high 10, medium 4, low 1), minimal 0. Skor scanner disimpan terpisah (`scanScore`) dan tidak dapat ditimpa oleh estimasi AI.

### 4.7 Runner Docker & Hosting

- Fitur Run dan Scan mengeksekusi container di host yang menjalankan ShieldForge.
- **Hosting**: butuh server dengan Docker daemon (VPS/VM). Pada platform serverless (mis. Vercel), fitur ini tidak tersedia; atur `RUNNER_MODE=disabled`.
- User akhir tidak perlu Docker; hanya server ShieldForge.

---

## 5. Mapping ke Standar Keamanan

ShieldForge mengimplementasikan **42 task** NIST SP 800-218 SSDF v1.1 yang di-crosswalk ke ISO/IEC 27001:2022 Annex A. Sebagian contoh pemetaan:

| Task Code | Judul | Tahap SDLC | ISO 27001:2022 |
|---|---|---|---|
| PO.1.1 | Define security requirements for software development | Analysis | A.5.1, A.5.8 |
| PO.1.2 | Define security requirements for software | Analysis | A.5.8, A.8.26, A.5.34 |
| PW.1.1 | Risk modeling (threat modeling) | Analysis, Design | A.8.26, A.8.27 |
| PW.2.1 | Review the software design | Design | A.8.26, A.8.27, A.8.29 |
| PW.5.1 | Follow secure coding practices | Development | A.8.28 |
| PW.6.1 | Use secure build tooling | Development | A.8.9, A.8.25 |
| PW.7.2 | Perform code review and analysis | Testing | A.8.28, A.8.29 |
| PW.8.2 | Perform and document testing | Testing | A.8.29, A.8.8 |
| PW.9.1 | Define secure baseline settings | Handover | A.8.9, A.8.28 |
| PS.1.1 | Protect code from unauthorized access | Development | A.8.2, A.8.3, A.8.4 |
| PS.3.2 | Share provenance data (SBOM) | Handover | A.5.19, A.5.21, A.8.24 |
| RV.1.1 | Gather vulnerability information | Testing | A.5.7, A.8.8 |
| RV.2.1 | Assess and prioritize vulnerabilities | Testing | A.5.25, A.8.8 |
| RV.3.1 | Root cause analysis | Handover | A.5.25, A.5.27 |

---

## 6. Cara Kerja AI Engine

1. **System Prompt Composition** - Mengambil StageDefinition, mengisi template dengan nama/deskripsi proyek, output language, preferensi UI, requirement (termasuk ID `REQ-SEC-*`), global spec, dan latest code.
2. **Model Resolution** - Mengambil model default user dari database atau konfigurasi env (DEFAULT_AI_PROVIDER + DEFAULT_AI_MODEL + DEFAULT_AI_API_KEY).
3. **AI Generation** - Mengirim request via `generateText()` (Vercel AI SDK), `maxRetries` untuk transient error.
4. **Result Parsing & Persistence** - Mengekstrak structured JSON (`stage_result`); pesan chat disimpan dalam satu transaksi, lalu rekomendasi, code artifacts, snapshot, requirement, dan link traceability disimpan dalam transaksi kedua setelah parsing.
5. **Recommendation Top-Up** - Jika rekomendasi kurang dari 3, engine melakukan second pass untuk melengkapinya.

---

## 7. Database Schema

| Model | Fungsi |
|---|---|
| User | Data pengguna (OAuth/Email) |
| Account | OAuth accounts (GitHub) |
| Session | Active sessions |
| VerificationToken | Token verifikasi email |
| ModelProvider | AI providers (openai, gemini, dll.) |
| UserApiKey | API keys terenkripsi (AES-256-GCM) |
| UserModel | Konfigurasi model AI per user |
| NistSsdfControl | 42 NIST SSDF task + mapping ISO |
| Stage | 5 tahap SDLC |
| Project | Proyek website yang dibuat |
| ProjectStage | Status setiap tahap per project |
| ProjectRevision | Riwayat revisi project |
| Chat | Sesi chat per tahap |
| Message | Pesan user/assistant |
| AiRecommendation | Rekomendasi keamanan dari AI (+ requirementIds) |
| WebsiteSnapshot | Code artifacts per tahap |
| Deliverable | File export (ZIP, PDF, GitHub) |
| SecurityRequirement | Requirement keamanan ber-ID (REQ-SEC-*) |
| RequirementLink | Relasi requirement -> rekomendasi -> file kode |
| SecurityFinding | Temuan hasil scanner (Semgrep/Trivy/audit) |
| AuditLog | Audit trail aksi penting |

---

## 8. Kesimpulan

ShieldForge berhasil direalisasikan dengan memanfaatkan teknologi modern pada ekosistem JavaScript/TypeScript. Aplikasi ini mengintegrasikan AI ke dalam alur kerja Secure SDLC yang terstruktur, dengan pendekatan keamanan berbasis NIST SP 800-218 dan ISO/IEC 27001:2022.

Fitur utama yang telah diimplementasikan meliputi:

- 5 tahap Secure SDLC dengan 26 sub-step
- 30+ REST API endpoint
- 42 task NIST SSDF v1.1 dengan crosswalk ISO/IEC 27001:2022 Annex A
- Multi-provider AI (Gemini, OpenAI, Anthropic, DeepSeek, Ollama, OpenRouter) dengan BYOK
- Traceability requirement keamanan -> NIST/ISO -> file kode
- Security scanning nyata (Semgrep + Trivy + audit dependency) dengan skor deterministik
- Runner Docker sandbox dengan preview dan log live
- Fungsi keamanan: CSRF, rate limiting, AES-256-GCM, security headers + CSP nonce
- Export deliverables: ZIP, Manual Book (PDF/MD), Laporan ISO (PDF/MD), Traceability Matrix (MD), GitHub push
- Multi-bahasa (EN/ID), dark/light mode, dan PWA
- Unit test (Vitest) untuk validasi path, parser scanner, skor, dan traceability
