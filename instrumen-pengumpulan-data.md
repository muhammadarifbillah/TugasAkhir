# PEDOMAN WAWANCARA

## Penelitian: Pengembangan Aplikasi SecureSDLC
### AI-Powered Secure SDLC Website Generator

---

**Peneliti:** [Nama Anda], Mahasiswa Program Studi [Prodi], Universitas [Nama Kampus]
**Dosen Pembimbing:** [Nama Dosen]
**Tahun:** 2026

---

## TENTANG APLIKASI SECURESDLC

**SecureSDLC** adalah platform web berbasis kecerdasan buatan yang memandu pengembang melewati 5 tahapan Secure SDLC (Secure Software Development Life Cycle) untuk membangun website. Aplikasi ini menggunakan:

- **5 Tahapan Berurutan:**
  1. **Analysis & Requirements** — Penentuan scope, rekomendasi stack teknologi, identifikasi requirement keamanan & privasi, klasifikasi data
  2. **Design & Architecture** — Perancangan UI/UX, arsitektur komponen, threat modeling (STRIDE), diagram alur, schema database
  3. **Secure Development** — Generate source code dengan praktik keamanan (parameterized queries, output encoding, autentikasi, CSRF protection, penanganan secrets)
  4. **Security Testing & Audit** — Review keamanan OWASP Top 10, perhitungan security score 0-100, perbaikan otomatis (remediation)
  5. **Handover & Deliverables** — Pembuatan Manual Book, Laporan Kepatuhan ISO 27001, Release Checklist, Export ke ZIP/GitHub

- **Framework Keamanan:** NIST SP 800-218 (SSDF) dengan crosswalk ke ISO 27001:2022 Annex A
- **Teknologi AI:** Mendukung berbagai provider (OpenAI, Anthropic, Gemini, Ollama) dengan pendekatan BYOK (Bring Your Own Key)
- **Fitur Tambahan:** Audit logging, multi-bahasa (14 bahasa), export PDF/dokumen, integrasi GitHub

**Tujuan Aplikasi:** Membantu tim pengembang menerapkan praktik keamanan sejak awal siklus pengembangan (secure-by-design) tanpa memerlukan ahli keamanan siber khusus di setiap tahapan, sekaligus menghasilkan dokumentasi keamanan yang dibutuhkan untuk kepatuhan terhadap standar internasional.

---

## CATATAN PELAKSANAAN WAWANCARA

### Persiapan Sebelum Wawancara

1. Konfirmasi jadwal dan durasi dengan responden (minimal 1 hari sebelumnya)
2. Siapkan perangkat perekam (dengan izin responden) atau alat catat
3. Pastikan responden memahami tujuan penelitian dan bagaimana data akan digunakan
4. Baca profil singkat responden jika ada (posisi, lama kerja, jenis proyek)
5. Cek kelengkapan pedoman wawancara dan lembar informed consent

### Pelaksanaan Saat Wawancara

1. Buka dengan perkenalan singkat dan ucapan terima kasih atas waktu responden
2. Jelaskan kembali tujuan wawancara (1-2 menit): "Saya sedang mengerjakan tugas akhir tentang pengembangan aplikasi yang membantu proses secure SDLC. Saya perlu memahami permasalahan yang Bapak/Ibu hadapi dalam pengembangan software saat ini."
3. Minta izin untuk merekam (jika menggunakan perekam)
4. Gunakan pertanyaan sebagai panduan, bukan naskah kaku — boleh melewati atau menambah pertanyaan sesuai alur percakapan
5. Ajukan pertanyaan pendalaman (follow-up) untuk mendapatkan insight yang lebih mendalam
6. Catat poin-poin penting dan temuan tak terduga
7. Hormati waktu responden — jika melewati durasi, hentikan dengan sopan

### Setelah Wawancara

1. Transkrip hasil wawancara dalam 24 jam
2. Identifikasi tema-tema yang muncul dari beberapa responden
3. Bandingkan perspektif antar peran
4. Dokumentasikan temuan kunci untuk analisis selanjutnya

---

## PEDOMAN WAWANCARA: KEPALA URUSAN PENGEMBANGAN APLIKASI

**Tujuan:** Memahami perspektif manajerial tentang tantangan keamanan dalam pengembangan software, kebutuhan otomasi, dan kelayakan adopsi solusi baru.

**Estimasi waktu:** 20-30 menit

---

### Part 1: Validasi Masalah

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 1 | Bapak, bagaimana proses pengembangan aplikasi yang diterapkan di unit/organisasi Bapak saat ini? Tahapan apa saja yang dilalui? | - Apakah ada tahapan khusus untuk keamanan? - Apakah setiap proyek mengikuti prosedur yang sama? |
| 2 | Tantangan terbesar apa yang dihadapi oleh tim pengembangan dalam memastikan keamanan aplikasi? | - Apakah berkaitan dengan keterbatasan SDM yang paham keamanan? - Atau keterbatasan waktu dan budget? - Bagaimana dampaknya terhadap proyek yang sedang berjalan? |
| 3 | Apakah organisasi Bapak perlu mematuhi standar keamanan tertentu (misal: ISO 27001, regulasi pemerintah, atau standar internal)? | - Bagaimana kendala dalam memenuhi standar tersebut? - Apakah proses audit keamanan sudah dilakukan secara rutin? |
| 4 | Bagaimana proses dokumentasi keamanan (manual book, laporan kepatuhan, security checklist) di unit Bapak saat ini? | - Apakah semua proyek wajib memiliki dokumentasi keamanan? - Berapa lama waktu yang dibutuhkan untuk membuat dokumentasi tersebut? |
| 5 | Seberapa sering tim pengembangan mengalami masalah keamanan (vulnerability, bug keamanan) setelah aplikasi berjalan di production? | - Apakah ada insiden yang pernah terjadi? - Bagaimana proses penanganannya? |

---

### Part 2: Validasi Solusi

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 6 | Bagaimana evaluasi Bapak terhadap penggunaan AI sebagai asisten dalam pengembangan software yang aman? Apakah Bapak melihat potensi manfaatnya? | - Apakah ada concern atau kekhawatiran tertentu terhadap penggunaan AI? - Bagaimana dengan kualitas dan kepercayaan terhadap output AI? |
| 7 | Jika ada solusi yang bisa memandu seluruh tahapan Secure SDLC secara terstruktur dengan bantuan AI — mulai dari analisis keamanan, perancangan arsitektur, generate kode aman, hingga pengujian keamanan — menurut Bapak seberapa dibutuhkan solusi seperti ini? | - Apakah fitur-fitur tersebut sesuai dengan kebutuhan yang ada? - Fitur mana yang menurut Bapak paling prioritas? |
| 8 | Menurut Bapak, apakah penting jika setiap tahapan pengembangan sudah terhubung dengan standar keamanan internasional (NIST SP 800-218 dan ISO 27001:2022) sehingga traceability pemenuhan keamanan bisa dilacak dari awal hingga akhir proyek? | - Apakah ini akan membantu proses audit? - Apakah ini akan meningkatkan kepercayaan stakeholder? |
| 9 | Jika aplikasi seperti ini tersedia, apakah Bapak bersedia untuk merekomendasikan penggunaannya di unit/organisasi Bapak? | - Apa syarat atau pertimbangan utama sebelum mengadopsi? - Apakah perlu integrasi dengan sistem yang sudah ada? - Apakah ada concern terkait keamanan data? |

---

## PEDOMAN WAWANCARA: SISTEM ANALIS

**Tujuan:** Memahami kebutuhan analisis keamanan, threat modeling, dan dokumentasi arsitektur.

**Estimasi waktu:** 20-30 menit

---

### Part 1: Validasi Masalah

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 1 | Bagaimana proses pengumpulan requirement (termasuk requirement keamanan) yang Bapak/Ibu lakukan saat ini? | - Apakah stakeholder selalu aware dengan kebutuhan keamanan? - Apakah requirement keamanan sering tertinggal atau dianggap sekunder? |
| 2 | Apakah Bapak/Ibu familiar dengan konsep threat modeling (misal: STRIDE)? Bagaimana penerapannya dalam proyek yang Bapak/Ibu tangani? | - Seberapa sering threat modeling dilakukan? - Siapa yang terlibat dalam proses tersebut? - Apakah ada kendala dalam penerapannya? |
| 3 | Tantangan apa yang paling sering dihadapi dalam mendokumentasikan arsitektur sistem dan alur keamanannya? | - Berapa lama waktu yang dibutuhkan untuk membuat dokumentasi arsitektur? - Apakah hasilnya mudah dipahami oleh seluruh tim? |
| 4 | Bagaimana Bapak/Ibu memastikan requirement keamanan benar-benar terakomodasi dalam setiap tahapan pengembangan? | - Apakah ada checklist atau standar internal yang digunakan? - Seberapa konsisten penerapannya di berbagai proyek? |

---

### Part 2: Validasi Solusi

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 5 | Jika ada tools yang bisa menghasilkan diagram arsitektur (component diagram, data flow diagram) dan threat model secara otomatis berdasarkan deskripsi proyek, menurut Bapak/Ibu seberapa membantu fitur tersebut? | - Apakah akan menghemat waktu kerja? - Apakah ada concern terhadap akurasi hasil generate AI? |
| 6 | Seberapa penting bagi Bapak/Ibu untuk bisa melacak (trace) requirement keamanan dari tahap analisis hingga implementasi kode? Misalnya, requirement "data sensitif harus dienkripsi" bisa dilacak ke kode mana yang mengimplementasikannya. | - Apakah ini sudah menjadi kebutuhan yang belum terpenuhi? - Apakah ini akan membantu proses audit? |
| 7 | Jika ada aplikasi yang bisa memandu proses analisis keamanan secara terstruktur — mulai dari identifikasi scope, rekomendasi stack, hingga klasifikasi data — dengan output yang sudah terhubung ke standar NIST/ISO, menurut Bapak/Ibu seberapa dibutuhkan solusi seperti ini? | - Aspek mana yang paling dibutuhkan? - Apakah ada yang belum sesuai dengan kebutuhan? |
| 8 | Menurut Bapak/Ibu, apakah pendekatan AI-assisted analysis (AI membantu analisis) bisa meningkatkan kualitas hasil analisis keamanan dibandingkan analisis manual sepenuhnya? | - Apakah ada risiko yang perlu diperhatikan? - Bagaimana cara memitigasi risiko tersebut? |

---

## PEDOMAN WAWANCARA: FRONTEND PROGRAMMER

**Tujuan:** Memahami kebutuhan secure coding di sisi frontend, awareness keamanan, dan produktivitas.

**Estimasi waktu:** 15-25 menit

---

### Part 1: Validasi Masalah

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 1 | Bagaimana Mas/Bpk memastikan kode frontend yang dihasilkan aman dari serangan seperti XSS (Cross-Site Scripting) dan CSRF (Cross-Site Request Forgery)? | - Apakah ada tools atau extension yang digunakan? - Seberapa awareness tim terhadap keamanan frontend dibandingkan backend? |
| 2 | Apakah Mas/Bpk pernah mengalami bug keamanan di kode frontend? Jika pernah, bagaimana penanganannya? | - Berapa lama waktu yang dibutuhkan untuk memperbaiki? - Apakah ada prosedur tertentu yang diikuti? |
| 3 | Bagaimana proses code review di tim Mas/Bpk? Apakah aspek keamanan selalu diperiksa saat code review? | - Apakah ada checklist review yang digunakan? - Siapa yang melakukan review? |
| 4 | Apakah Mas/Bpk pernah menggunakan AI code assistant (GitHub Copilot, Cursor, atau sejenisnya)? Bagaimana pengalamannya? | - Apakah output kode AI bisa dipercaya dari sisi keamanan? - Pernahkah ada masalah keamanan dari kode yang dihasilkan AI? |

---

### Part 2: Validasi Solusi

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 5 | Jika ada AI yang bisa menghasilkan komponen UI/frontend dengan security best practices yang sudah terintegrasi (misal: auto-generate security headers, input validation, CSRF token handling), menurut Mas/Bpk seberapa membantu fitur tersebut? | - Apakah akan mempercepat kerja? - Apakah ada concern terhadap kualitas kode yang dihasilkan? |
| 6 | Apakah pembuatan dokumentasi kode (README, komponen docs, technical documentation) masih menjadi beban kerja Mas/Bpk? Berapa banyak waktu yang dihabiskan untuk itu? | - Jika ada AI yang bisa auto-generate dokumentasi, apakah akan membantu? |
| 7 | Jika ada aplikasi yang bisa memandu proses frontend development secara terstruktur — mulai dari perancangan UI/UX, generate kode komponen, hingga security review — dengan output yang sesuai standar keamanan, menurut Mas/Bpk seberapa dibutuhkan solusi seperti ini? | - Fitur mana yang paling menarik? - Apakah ada yang masih kurang? |
| 8 | Menurut Mas/Bpk, apakah penting jika setiap kode yang dihasilkan sudah dilengkapi dengan penjelasan mengapa fitur keamanan tertentu diterapkan (misal: "input ini di-sanitize untuk mencegah XSS")? | - Apakah ini akan membantu proses belajar? - Apakah ini akan membantu tim yang berbeda pemahaman keamanannya? |

---

## PEDOMAN WAWANCARA: BACKEND PROGRAMMER

**Tujuan:** Memahami kebutuhan secure coding di sisi backend, database security, dan deployment.

**Estimasi waktu:** 15-25 menit

---

### Part 1: Validasi Masalah

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 1 | Bagaimana Mas/Bpk mencegah SQL injection dan vulnerability lainnya di kode backend? | - Apakah menggunakan ORM atau parameterized queries? - Seberapa konsisten penerapannya? |
| 2 | Apakah Mas/Bpk pernah mengalami insiden keamanan di production? Jika pernah, bagaimana penanganannya? | - Apa penyebab utama insiden tersebut? - Berapa lama waktu recovery? - Apakah ada lesson learned? |
| 3 | Bagaimana Mas/Bpk mengelola secrets (API keys, credentials, tokens) dalam proyek? | - Apakah menggunakan .env, vault, atau cara lain? - Seberapa aman cara yang digunakan saat ini? |
| 4 | Bagaimana dependency management di tim Mas/Bpk? Apakah dicek vulnerability di dependencies yang digunakan? | - Apakah menggunakan npm audit, Snyk, atau Dependabot? - Seberapa sering pengecekan dilakukan? - Pernahkah menemukan vulnerability di dependencies? |

---

### Part 2: Validasi Solusi

| No | Pertanyaan Utama | Pertanyaan Pendalaman |
|----|-----------------|----------------------|
| 5 | Jika ada AI yang bisa generate kode backend dengan security best practices yang sudah terintegrasi — misalnya: parameterized queries (bukan string concatenation), error handling yang aman (tidak bocor informasi sensitif), CSRF protection — menurut Mas/Bpk seberapa membantu fitur tersebut? | - Apakah output kode AI bisa dipercaya? - Apakah akan membantu mengurangi vulnerability? |
| 6 | Apakah proses deployment dan CI/CD di tim Mas/Bpk sudah mengintegrasikan security scanning? Jika belum, apakah ada rencana untuk mengintegrasikannya? | - Tools apa yang digunakan (jika ada)? - Apakah ada kendala dalam mengintegrasikannya? |
| 7 | Jika ada aplikasi yang bisa memandu proses backend development secara terstruktur — mulai dari perancangan database schema, implementasi autentikasi/otorisasi, hingga security testing (OWASP Top 10 review) — dengan output yang sudah terhubung ke standar NIST/ISO, menurut Mas/Bpk seberapa dibutuhkan solusi seperti ini? | - Fitur mana yang paling dibutuhkan? - Apakah ada yang belum sesuai kebutuhan? |
| 8 | Menurut Mas/Bpk, seberapa penting memiliki laporan kepatuhan keamanan (compliance report) yang dihasilkan otomatis setiap proyek selesai? Misalnya: laporan yang menunjukkan proyek sudah memenuhi kontrol keamanan mana saja dari standar ISO 27001. | - Apakah ini akan membantu proses audit? - Apakah ini akan meningkatkan kepercayaan klien/stakeholder? |

---

## RINGKASAN KEBUTUHAN DATA PER RESPONDEN

| Responden | Fokus Validasi Masalah | Fokus Validasi Solusi |
|-----------|----------------------|----------------------|
| **Kepala Urusan Pengembangan Aplikasi** | Proses SDLC, tantangan keamanan, compliance, dokumentasi, insiden | Kebutuhan otomasi, AI sebagai asisten, traceability NIST/ISO, adopsi |
| **Sistem Analis** | Requirements gathering, threat modeling, dokumentasi arsitektur, checklist | Diagram otomatis, traceability requirement, AI-assisted analysis |
| **Frontend Programmer** | XSS/CSRF prevention, code review, AI code assistant experience | Secure UI generation, dokumentasi otomatis, security explanation |
| **Backend Programmer** | SQL injection, secrets management, dependencies, insiden production | Secure backend generation, CI/CD security, compliance report otomatis |

---

**Selesai Pedoman Wawancara.**
