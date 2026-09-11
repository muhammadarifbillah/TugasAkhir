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
4. Cek kelengkapan pedoman wawancara dan lembar informed consent

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

**Estimasi waktu:** 15-20 menit

| No | Pertanyaan | Pertanyaan Pendalaman |
|----|-----------|----------------------|
| 1 | Bapak, bagaimana proses pengembangan aplikasi yang diterapkan di unit Bapak saat ini? Tahapan apa saja yang dilalui dari awal hingga deployment? | - Apakah ada tahapan khusus untuk keamanan? - Apakah setiap proyek mengikuti prosedur yang sama? |
| 2 | Tantangan terbesar apa yang dihadapi tim Bapak dalam memastikan keamanan aplikasi? Apakah itu berkaitan dengan SDM, waktu, tools, atau hal lain? | - Apakah ada insiden keamanan yang pernah terjadi? - Bagaimana dampaknya terhadap proyek? |
| 3 | Apakah selama ini ada standar keamanan (misal: ISO 27001, regulasi pemerintah) yang harus dipatuhi? Bagaimana kendala pemenuhannya? | - Apakah proses audit keamanan sudah dilakukan secara rutin? - Berapa biaya yang dikeluarkan untuk compliance? |
| 4 | Jika ada solusi yang bisa memandu seluruh tahapan pengembangan secara terstruktur — mulai dari analisis, perancangan, coding, testing, hingga handover — dengan pendekatan keamanan yang sudah terintegrasi, menurut Bapak seberapa dibutuhkan solusi seperti ini? | - Fitur mana yang menurut Bapak paling prioritas? - Apakah ada concern terhadap penggunaan solusi baru? |
| 5 | Apakah Bapak bersedia menggunakan atau merekomendasikan solusi seperti ini jika tersedia? Apa pertimbangan utamanya? | - Apakah perlu integrasi dengan sistem yang sudah ada? - Apakah ada concern terkait keamanan data? |

---

## PEDOMAN WAWANCARA: SISTEM ANALIS

**Tujuan:** Memahami kebutuhan analisis keamanan, threat modeling, dan dokumentasi arsitektur.

**Estimasi waktu:** 15-20 menit

| No | Pertanyaan | Pertanyaan Pendalaman |
|----|-----------|----------------------|
| 1 | Bagaimana proses pengumpulan requirement yang Bapak/Ibu lakukan saat ini, terutama terkait requirement keamanan? | - Apakah stakeholder selalu aware dengan kebutuhan keamanan? - Apakah requirement keamanan sering tertinggal atau dianggap sekunder? |
| 2 | Tantangan apa yang paling sering dihadapi dalam menganalisis dan mendokumentasikan aspek keamanan sistem? Apakah ada hal yang dirasa kurang efisien? | - Berapa lama waktu yang dibutuhkan untuk membuat dokumentasi arsitektur? - Apakah hasilnya mudah dipahami oleh seluruh tim? |
| 3 | Apakah Bapak/Ibu pernah menggunakan tools tertentu untuk membantu proses analisis arsitektur atau threat modeling? Bagaimana pengalamannya? | - Apakah tools yang ada sudah memadai? - Apakah ada fitur yang masih kurang dari tools tersebut? |
| 4 | Jika ada tools yang bisa membantu Bapak/Ibu mengidentifikasi potensi ancaman keamanan dan menghasilkan dokumentasi arsitektur secara otomatis — tanpa menggantikan peran analisis manusia tapi sebagai asisten — menurut Bapak/Ibu seberapa membantu? | - Apakah akan menghemat waktu kerja? - Apakah ada concern terhadap akurasi hasil generate? |
| 5 | Menurut Bapak/Ibu, apakah penting jika requirement keamanan bisa dilacak (trace) dari tahap analisis hingga ke kode implementasinya? Mengapa? | - Apakah ini sudah menjadi kebutuhan yang belum terpenuhi? - Apakah ini akan membantu proses audit? |

---

## PEDOMAN WAWANCARA: FRONTEND PROGRAMMER

**Tujuan:** Memahami kebutuhan secure coding di sisi frontend, awareness keamanan, dan produktivitas.

**Estimasi waktu:** 15-20 menit

| No | Pertanyaan | Pertanyaan Pendalaman |
|----|-----------|----------------------|
| 1 | Bagaimana Mas/Bpk memastikan kode frontend yang dihasilkan aman dari serangan seperti XSS dan CSRF? Apakah ada prosedur atau tools yang digunakan? | - Seberapa awareness tim terhadap keamanan frontend dibandingkan backend? |
| 2 | Pernahkah Mas/Bpk mengalami bug keamanan di kode frontend? Bagaimana proses penanganannya dan berapa lama waktu yang dibutuhkan? | - Apa penyebab utama bug tersebut? - Apakah ada prosedur tertentu yang diikuti? |
| 3 | Apakah Mas/Bpk pernah menggunakan AI code assistant (Copilot, Cursor, dll)? Menurut Mas/Bpk, apakah kode yang dihasilkan AI sudah bisa dipercaya dari sisi keamanan? | - Pernahkah ada masalah keamanan dari kode yang dihasilkan AI? |
| 4 | Jika ada solusi yang bisa membantu Mas/Bpk menulis kode frontend yang aman — misalnya dengan panduan实践 practice atau auto-detection potensi vulnerability — menurut Mas/Bpk seberapa membantu? | - Apakah akan mempercepat kerja? - Apakah ada concern terhadap kualitas kode yang dihasilkan? |
| 5 | Apakah Mas/Bpk tertarik menggunakan solusi seperti ini dalam pekerjaan sehari-hari? Apa yang menjadi pertimbangan utama? | - Apa yang paling menarik dari solusi tersebut? - Apa yang menjadi hambatan untuk menggunakannya? |

---

## PEDOMAN WAWANCARA: BACKEND PROGRAMMER

**Tujuan:** Memahami kebutuhan secure coding di sisi backend, database security, dan deployment.

**Estimasi waktu:** 15-20 menit

| No | Pertanyaan | Pertanyaan Pendalaman |
|----|-----------|----------------------|
| 1 | Bagaimana Mas/Bpk mencegah SQL injection dan vulnerability lainnya di kode backend? Apakah sudah menggunakan ORM atau parameterized queries secara konsisten? | - Seberapa konsisten penerapannya di berbagai proyek? |
| 2 | Pernahkah Mas/Bpk mengalami insiden keamanan di production? Apa penyebabnya dan bagaimana proses recovery-nya? | - Berapa lama waktu yang dibutuhkan untuk recovery? - Apakah ada lesson learned? |
| 3 | Bagaimana dependency management di tim Mas/Bpk? Apakah dicek secara berkala untuk vulnerability di library yang digunakan? | - Apakah menggunakan npm audit, Snyk, atau Dependabot? - Pernahkah menemukan vulnerability di dependencies? |
| 4 | Jika ada solusi yang bisa membantu Mas/Bpk menulis kode backend yang aman — misalnya dengan auto-detection SQL injection, panduan autentikasi yang benar, atau security review otomatis — menurut Mas/Bpk seberapa membantu? | - Apakah output solusi seperti ini bisa dipercaya? - Apakah akan membantu mengurangi vulnerability? |
| 5 | Jika ada solusi yang juga bisa menghasilkan laporan kepatuhan keamanan (compliance report) secara otomatis setelah proyek selesai, apakah itu nilai tambah yang berarti bagi Mas/Bpk? | - Apakah ini akan membantu proses audit? - Apakah ini akan meningkatkan kepercayaan klien/stakeholder? |

---

## RINGKASAN KEBUTUHAN DATA PER RESPONDEN

| Responden | Fokus Validasi Masalah | Fokus Validasi Solusi |
|-----------|----------------------|----------------------|
| **Kepala Urusan Pengembangan Aplikasi** | Proses SDLC, tantangan keamanan, compliance | Kebutuhan otomasi, kesiapan adopsi |
| **Sistem Analis** | Requirements gathering, dokumentasi arsitektur, tools saat ini | Asisten otomatis, traceability requirement |
| **Frontend Programmer** | XSS/CSRF prevention, bug experience, AI assistant | Secure coding assistance, auto-detection |
| **Backend Programmer** | SQL injection, insiden production, dependencies | Secure coding assistance, compliance report |

---

**Selesai Pedoman Wawancara.**
