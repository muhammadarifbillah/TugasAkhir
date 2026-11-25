# PRD Landing + Dashboard {NAMA}: Hero 3D, GSAP, Lenis, ATM (versi 3)

| Field | Isi |
|---|---|
| Versi | 3 (putaran Mandor 3, lulus peninjau skor 91; menimpa arah v1) |
| Tanggal | 2026-11-26 |
| Repo acuan | `C:\Users\Arif\Downloads\TugasAkhir`, HEAD d6da5f8 |
| Nama produk | `{NAMA}`; rekomendasi `{NAMA-REKOM}` = **Saksi** (`penamaan.md`) |
| Konsep hero | rekomendasi **Pita Pindai** (`konsep-hero-3d.md`) |
| Sumber | id `Sxx` menunjuk `sumber.json` |

### Keputusan M0 (diputuskan pemilik 2026-11-26)

Pemilik menyetujui seluruh usulan default ("ya, lanjut kerjakan semua PRD-nya"):

| Keputusan | Putusan |
|---|---|
| Nama produk | **Saksi** (cek DJKI kelas 9/42 dan domain belum dilakukan; tanggung jawab pemilik sebelum publikasi) |
| Konsep hero | **Pita Pindai** |
| Identitas temper (5 warna + hallmark) | **dipertahankan** |
| Tema Dark Clay (default) + Light Clay | **dipertahankan** |
| Bab/instrumen skripsi | judul tidak berubah; dokumen yang menyebut nama produk direvisi dengan catatan "sebelumnya ShieldForge" |
| CSV/laporan | memakai nama baru; volume Docker `shieldforge-db` **tidak** di-rename |

### Keputusan yang menunggu pemilik (riwayat, sebelum M0)

| Keputusan | Pilihan | Rekomendasi | Tenggat | Akibat bila ditunda |
|---|---|---|---|---|
| Nama produk | 10 kandidat di `penamaan.md` | Saksi (27/30) | 2026-12-03 | M1–M4 tetap bisa jalan dengan `{NAMA}`, tetapi M5 (migrasi) dan wordmark hero tertahan; setiap minggu tambahan menambah bab/instrumen skripsi yang memakai nama lama (judul tidak terdampak, S98) |
| Konsep hero | Pintu Sluis Lima, Pita Pindai, Benang Bukti, Silinder Lima Pin | Pita Pindai (90,5) | 2026-12-03 | M1 (carrier) bisa jalan, M2 (hero) tidak bisa dimulai; part list dan timeline bergantung pada konsep |
| Identitas temper (5 warna + hallmark) dipertahankan? | ya / tidak | ya, sebagai warna kepala baca | 2026-12-03 | token `--stage-1..5` dan hallmark tetap dipakai sementara; bila kemudian dibuang, kupon gerbang, rail, dan dashboard perlu digambar ulang |

## 1. Ringkasan eksekutif

Landing dan dashboard {NAMA} didesain ulang agar pesan utamanya terlihat sebelum dibaca: kode dari AI tidak lolos tanpa bukti. Hero memakai konsep **Pita Pindai**: pita diff berjalan di bawah lima kepala baca, kepala 4 (Semgrep + Trivy) menjepit baris rentan, dan odometer turun dari 100 ke 91. Setiap unsur gerak punya padanan di kode produk. Nama yang direkomendasikan: **Saksi** (`{NAMA-REKOM}`), menunggu keputusan pemilik.

Pembaca: junior dev, dev indie/SME, dev yang peduli keamanan, dan dosen penguji.

Keputusan teknis: figur SVG isometrik dari kit anatomy, tanpa three.js dan tanpa kanvas WebGL. Biaya JS tambahan hanya di chunk landing desktop: GSAP 27 434 + ScrollTrigger 17 991 + Lenis 5 483 = **50 908 B gz** motion, ditambah `live.tsx` 1 526 B gz carrier, total **52 434 B gz** (S05, S06, S07, S14). Mobile, reduced motion, dan no-JS mendapat poster statis (0 B JS tambahan).

PRD ini tidak mengeksekusi rename. Rename punya milestone sendiri (M5).

## 2. Latar dan masalah

Kode buatan AI sering lolos ke produksi tanpa ada yang memeriksanya. Laporan Veracode (edisi Oktober 2025) menguji kode dari lebih dari 100 LLM dalam Java, JavaScript, Python, dan C#, dan menemukan celah keamanan berisiko pada **45% pengujian** (S19, S20). Edisi 2026 ada di situs yang sama; angka pada laporan ini dikutip dari edisi Oktober 2025 (S101). Pearce dkk. menemukan sekitar 40% dari 1 689 program Copilot rentan (S21). Perry dkk. menemukan peserta dengan asisten AI menulis kode yang kurang aman dan lebih yakin kodenya aman (S22).

| Masalah | Akibat | Respons {NAMA} |
|---|---|---|
| Generator AI menulis kode tanpa tahap analisis dan desain | kebutuhan keamanan tidak pernah ditulis | 5 gerbang berurutan, dikunci di server (S81) |
| Tidak ada pemindaian sebelum rilis | celah yang bisa ditemukan alat tetap terkirim | Semgrep dan Trivy di gerbang testing (S36) |
| Kualitas keamanan dinilai dengan perasaan | tidak bisa dibandingkan antar revisi | skor deterministik: 100 dikurangi bobot severity (S36) |
| Bukti tidak terhubung ke standar | sulit dipertanggungjawabkan ke dosen atau klien | temuan menyimpan berkas, baris, task NIST, kontrol ISO (S78, S79) |

Landing sekarang membuka dengan perisai dan kata "AMANKAN" (audit-landing-1440-v2.png, S84). Gambar itu menyatakan hasil, bukan proses, sehingga tidak memperlihatkan urutan, pemindai, atau skor.

## 3. Tujuan dan metrik

| Goal | Target | Cara ukur |
|---|---|---|
| G1 Pesan terbaca tanpa lede | 4 dari 5 penguji baru menyebut "kode AI diperiksa/dipindai sebelum dikirim" setelah 10 detik melihat hero | uji lorong 5 orang, catatan manual |
| G2 LCP tetap H1 | LCP ≤ 2,5 s (S26), elemen LCP = H1 | Lighthouse build produksi di worktree/CI |
| G3 Tanpa geser layout | CLS ≤ 0,1 (S27) | Lighthouse + Playwright `PerformanceObserver` |
| G4 Responsif | INP ≤ 200 ms (S28) | Lighthouse timespan, scroll hero penuh |
| G5 Biaya JS | tambahan ≤ 52 434 B gz di chunk landing desktop; 0 B di mobile | `next build` di CI + analisis chunk |
| G6 Aksesibel | 0 pelanggaran axe serius; hero berhenti di reduced motion | Playwright + axe |
| G7 Jujur | setiap angka di hero ada di `landing-facts.ts` atau `score.ts` | `landing-facts.test.ts` + review manual |
| G8 Keputusan sebelum kode | pemilik memilih nama dan konsep sebelum M2 dimulai | blok keputusan terisi + tanggal |
| G9 Nama lama hilang dari UI | `git grep -i` nama lama di `src/dictionaries`, `src/components`, `src/app` = 0 setelah M5 (kecuali komentar warisan dan volume) | `git grep` |
| G10 Selaras judul skripsi | blok hook di atas lipatan memuat minimal 2 dari 3 keluarga kata kunci judul (K1, K2, K3) pada H1 + sub-headline, dan ketiganya muncul pada blok H1 + sub-headline + lede | hitung manual terhadap definisi K1–K3 di bawah; hasil ditulis sebagai tabel centang di bab 7 |

Definisi keluarga kata kunci judul (S98, spek-v3 bagian 6):

| Kode | Keluarga | Diterima sebagai bukti |
|---|---|---|
| K1 | Generative AI / AI codegen | "AI", "kode AI", "generative", "AI-assisted", "kode hasil AI" |
| K2 | platform pembuat atau pengembangan aplikasi web | "platform", "membangun website/aplikasi web", "generator website", "studio web", "membuat aplikasi web" |
| K3 | secure development controls + ISO/IEC 27001:2022 | "ISO/IEC 27001:2022", atau "kontrol pengembangan aman" yang berdampingan dengan nomor Annex A |

## 4. Non-goals

1. Bukan redesign studio, settings, atau auth.
2. Bukan fitur produk baru; hero hanya menggambar yang sudah ada.
3. Bukan blog, changelog publik, atau halaman harga.
4. Tanpa testimoni, logo klien, award, atau angka pengguna.
5. Bukan WebGL wajib; tidak ada three.js, r3f, atau Spline.
6. Bukan animasi di mobile.
7. **PRD ini tidak melakukan rename.** Rename dieksekusi di M5 setelah keputusan pemilik, mengikuti `penamaan.md`.

## 5. Persona

| Persona | Kebutuhan | Keberatan | Dicari di halaman | Sinyal kepercayaan jujur |
|---|---|---|---|---|
| Junior dev | membuat website cepat dengan AI tanpa malu saat direview | "alat keamanan itu rumit" | apa yang terjadi setelah prompt | alur 5 gerbang, contoh skor 91 |
| Dev indie/SME | kirim ke klien dengan laporan | "menambah waktu" | keluaran: ZIP, push GitHub, dokumen | daftar keluaran, CSV matriks |
| Dev peduli keamanan | tahu alat apa yang berjalan | "hanya membungkus LLM" | nama pemindai, rumus skor, pemetaan | Semgrep, Trivy, bobot 20/10/4/1, kode PW.x |
| Dosen penguji | menilai kelayakan dan kejujuran | klaim berlebihan | batas produk, metode, sumber | bagian "yang tidak dijanjikan", sitasi Veracode |

## 6. Nilai jual dan positioning

| Kemampuan | {NAMA} | Generator AI (Copilot, Cursor, v0, Bolt, Lovable) | Pemindai (Snyk, Semgrep, Socket, Dependabot) | Jangan diklaim |
|---|---|---|---|---|
| Menulis kode | ya, lewat 6 provider (S33) | ya | tidak | "lebih pintar dari X" |
| Memaksa urutan tahap | ya, 5 gerbang di server | tidak | tidak | "tidak bisa dibobol" |
| Bukti terpetakan ISO/IEC 27001:2022 (utama) dan NIST SSDF (pelengkap) | ya, per gerbang dan per temuan (S79, S80) | tidak | sebagian (bervariasi) | "patuh ISO 27001" |
| Skor deterministik | ya, rumus tetap (S36) | tidak | skor sendiri-sendiri | "skor resmi" |
| BYOK | ya | bervariasi | tidak relevan | - |
| Sandbox run | ya (pratinjau) | bervariasi | tidak | - |
| Ekspor laporan | ZIP, dokumen, CSV, push GitHub | tidak | laporan pemindai | "laporan audit" |
| Harga | proyek skripsi; tidak ada harga publik | berbayar/freemium | berbayar/freemium | angka harga |

Kolom pembanding untuk produk lain bersifat umum dan tidak dipakai sebagai klaim di landing.

### Sumbu standar

ISO/IEC 27001:2022 Annex A adalah sumbu utama; NIST SSDF (SP 800-218) adalah pelengkap. Kalimat di landing selalu memakai "dipetakan ke" (EN: "mapped to"). Annex A 2022 memuat nomor kontrol A.8.25 sampai A.8.31 di tema teknologi (S99, S100); produk memetakan ketujuh nomor itu, dengan lokasi berikut. Nama resmi tiap kontrol: lihat Annex A (S99).

| Nomor | Dipetakan di | Lokasi kode |
|---|---|---|
| A.8.25 | gerbang 2 (design) | `src/lib/stages.ts:76` (S102) |
| A.8.26 | gerbang 1 (analysis), gerbang 2 | `src/lib/stages.ts:30`, `:76` (S102) |
| A.8.27 | gerbang 2 | `src/lib/stages.ts:76` (S102) |
| A.8.28 | gerbang 3 (development); temuan injeksi/XSS | `src/lib/stages.ts:151` (S102); `src/lib/scanner/mapping.ts:23-24` (S103) |
| A.8.29 | gerbang 3, gerbang 4 (testing); cap gerbang 4 (PW.8.1); temuan dependency | `src/lib/stages.ts:151`, `:210` (S102); `src/lib/landing-facts.ts:42`, `prisma/seed.ts:98` (S105); `mapping.ts:26` (S103) |
| A.8.30 | gerbang 5 (handover) | `src/lib/stages.ts:250` (S102) |
| A.8.31 | gerbang 4, gerbang 5; temuan misconfiguration | `src/lib/stages.ts:210`, `:250` (S102); `mapping.ts:27` (S103) |

Nomor di luar A.8.25–A.8.31 yang juga dipetakan produk (A.5.15–A.5.17, A.8.5, A.8.8, A.8.9, A.8.12, A.8.22, A.8.33, dan lain-lain) tetap tampil di tabel bukti, tetapi tidak dipakai sebagai sumbu di hook.

## 7. Hook dan CTA

| # | H1 (ID) | H1 (EN) | Jelas | Bisa dibuktikan | Khas | Tidak clickbait | Total |
|---|---|---|---|---|---|---|---|
| 1 | Kode dari AI dibaca lima gerbang sebelum boleh dikirim. | AI code is read by five gates before it ships. | 5 | 5 | 4 | 5 | **19** |
| 2 | {NAMA} menahan kode AI sampai buktinya ada. | {NAMA} holds AI code until the evidence exists. | 4 | 5 | 4 | 5 | 18 |
| 3 | Lima gerbang, pemindai nyata, skor yang bisa dihitung ulang. | Five gates, real scanners, a score you can recompute. | 4 | 5 | 3 | 5 | 17 |
| 4 | Kode AI cepat jadi. {NAMA} memastikan ada yang memeriksanya. | AI code is fast. {NAMA} makes sure someone checks it. | 4 | 4 | 3 | 4 | 15 |
| 5 | Kode AI lolos hanya bila ada saksinya. (varian nama Saksi) | AI code ships only with a witness. | 4 | 5 | 5 | 5 | **19** |
| 6 | Setiap temuan punya baris, skor, dan kontrol standar. | Every finding has a line, a score and a control. | 3 | 5 | 4 | 5 | 17 |
| 7 | Kode dari AI dipetakan ke kontrol pengembangan aman ISO/IEC 27001:2022. | AI code, mapped to ISO/IEC 27001:2022 secure development controls. | 4 | 5 | 3 | 5 | 17 |
| 8 | Platform website berbasis AI, dengan lima gerbang yang dipetakan ke ISO/IEC 27001:2022. | An AI website platform with five gates mapped to ISO/IEC 27001:2022. | 4 | 5 | 3 | 5 | 17 |
| 9 | {NAMA} membangun website dengan AI dan menahan rilisnya di kontrol pengembangan aman ISO/IEC 27001:2022. | {NAMA} builds websites with AI and holds each release at ISO/IEC 27001:2022 secure development controls. | 4 | 5 | 3 | 5 | 17 |

Kata kunci judul per H1 (tambahan putaran 3; skor di tabel atas tidak berubah; baris 8 dan 9 baru):

| # | K1 | K2 | K3 | Jumlah kata kunci |
|---|---|---|---|---|
| 1 | 1 | 0 | 0 | 1 |
| 2 | 1 | 0 | 0 | 1 |
| 3 | 0 | 0 | 0 | 0 |
| 4 | 1 | 0 | 0 | 1 |
| 5 | 1 | 0 | 0 | 1 |
| 6 | 0 | 0 | 0 | 0 |
| 7 | 1 | 0 | 1 | 2 |
| 8 | 1 | 1 | 1 | 3 |
| 9 | 1 | 1 | 1 | 3 |

**Rekomendasi:** #1 sebagai H1, karena cocok satu-satu dengan gerak Pita Pindai dan tidak bergantung pada nama. Bila pemilik memilih Saksi, #5 dipakai sebagai tagline di bawah wordmark, bukan sebagai H1, agar H1 tetap terbaca oleh orang yang belum tahu arti nama. Catatan putaran 3: #1 hanya memuat K1; K2 dan K3 dipenuhi oleh sub-headline di bawahnya, sehingga G10 tetap tercapai tanpa mengganti H1.

Sub-headline (di atas lipatan, tepat di bawah H1):

- ID: "{NAMA} membangun website dengan AI, lalu menahan setiap rilis di kontrol pengembangan aman yang dipetakan ke ISO/IEC 27001:2022 Annex A."
- EN: "{NAMA} builds websites with AI, then holds every release at secure development controls mapped to ISO/IEC 27001:2022 Annex A."

Lede (ID): "{NAMA} adalah platform tempat AI membangun website, dengan lima gerbang yang mengunci urutan: analisis, desain, kode, pemindaian nyata oleh Semgrep dan Trivy, lalu serah terima. Tiap gerbang dipetakan ke ISO/IEC 27001:2022 Annex A, dengan NIST SSDF sebagai pelengkap."

Lede (EN): "{NAMA} is a platform where AI builds your website, with five gates that lock the order: analysis, design, code, real scans by Semgrep and Trivy, then handover. Every gate is mapped to ISO/IEC 27001:2022 Annex A, with NIST SSDF as a complement."

(Lede v2 yang hanya menyebut pemindai diganti; teks lamanya ada di `_cadangan-v2/`.)

Tabel centang G10:

| Blok | K1 | K2 | K3 |
|---|---|---|---|
| H1 #1 | ✓ ("Kode dari AI") | - | - |
| Sub-headline | ✓ ("dengan AI") | ✓ ("membangun website") | ✓ ("kontrol pengembangan aman ... ISO/IEC 27001:2022 Annex A") |
| Lede | ✓ ("AI membangun website") | ✓ ("platform") | ✓ ("ISO/IEC 27001:2022 Annex A") |
| **H1 + sub-headline** | ✓ | ✓ | ✓ → 3 dari 3 (ambang ≥ 2) |
| **H1 + sub-headline + lede** | ✓ | ✓ | ✓ → ketiganya muncul |

Penekanan standar mengikuti judul skripsi (S98): ISO/IEC 27001:2022 disebut lebih dulu di hero, lede, dan cap margin pita (A.8.29 - PW.8.1); NIST SSDF tampil sebagai pelengkap. Wording tetap "dipetakan ke". Alternatif #7 dipakai sebagai judul section `#bukti` bila pemilik ingin kata kunci judul muncul eksplisit di landing.

| CTA | Teks ID | Teks EN | Tujuan |
|---|---|---|---|
| Primer | Mulai proyek gratis | Start a free project | `/[lang]/register` |
| Sekunder | Lihat contoh laporan | See a sample report | anchor `#bukti` |

Frasa terlarang di semua copy: "bersertifikat", "patuh standar", "100% aman", "terjamin", "diperkeras", padanan Inggrisnya (daftar di spek-v2 §14), testimoni, dan angka pengguna.

## 8. Riset referensi dan ATM

Ringkasan dari `riset-referensi-atm.md` (S85–S96):

| # | Situs | Hook | Objek | Pola scroll | Yang diambil |
|---|---|---|---|---|---|
| 01 | Linear | The product development system for teams and agents | SVG + mockup | tanpa pin | produk sebagai bukti visual |
| 02 | Vercel | Agentic Infrastructure | canvas latar, muncul bertahap | 2 sticky | H1 tidak menunggu efek |
| 03 | Raycast | Your shortcut to everything. | three.js r186 | tanpa pin | objek mewakili produk |
| 04 | Supabase | Build in a weekend Scale to millions | video produk | 1 sticky | rekaman produk asli |
| 05 | Resend | Email for developers | Spline + mp4 cadangan | 1 sticky | satu objek + fallback |
| 06 | Clerk | Everything you need for authentication | komponen UI | 1 sticky | potongan UI nyata |
| 07 | Railway | Let agents ship products as fast as they write code | canvas di bawah hero | 3 sticky | efek berat ditunda |
| 08 | Snyk | Unleash AI Innovators – Securely | video | 2 sticky | (kontra) kata sifat tanpa bukti |
| 09 | Semgrep | Code Security for Builders and Agents | Rive + WASM | 2 sticky | animasi pemindaian |
| 10 | Cursor | Cursor is your coding agent ... | video logo | 7 sticky | H1 satu kalimat |
| 11 | Warp | The software factory infrastructure platform | grafik | 1 sticky | metafora mesin |
| 12 | Socket | tidak terbaca (403) | - | - | tidak dipakai |

Tidak satu pun dari 11 situs yang terbaca memasang `.pin-spacer` atau kelas `lenis`. Pin + scrub pada hero adalah pilihan proyek ini, jadi aturan anti scroll-jacking di bagian 11 wajib.

## 9. IA landing per section

Urutan dan komponen diambil dari audit DOM (audit-landing.md bagian 1). Yang berubah: blok hero; `guard-grid` dan `audience-tiles`/`about-section` digabung.

| # | id anchor | Judul ID | Judul EN | Isi | Komponen | Sumber fakta | Alasan urutan |
|---|---|---|---|---|---|---|---|
| 1 | `mulai-hero` (baru) | H1 #1 bagian 7 + sub-headline: "{NAMA} membangun website dengan AI, lalu menahan setiap rilis di kontrol pengembangan aman yang dipetakan ke ISO/IEC 27001:2022 Annex A." | H1 #1 EN + sub-headline: "{NAMA} builds websites with AI, then holds every release at secure development controls mapped to ISO/IEC 27001:2022 Annex A." | H1, sub-headline, dan lede di atas lipatan; **Pita Pindai** (pin, scrub), tabel temuan HTML di bawah panggung, 2 CTA | `hero-tape.tsx` (baru), poster Tier 0 | `score.ts`, `GATE_MAPPING` (`landing-facts.ts:42`), `STAGE_DEFINITIONS` (`src/lib/stages.ts`), `src/lib/scanner/mapping.ts` | pesan utama dulu |
| 2 | - | strip standar | standards strip | chip ISO/IEC 27001:2022 Annex A (utama), NIST SSDF (pelengkap), Semgrep, Trivy | `standards-strip.tsx` | `src/lib/stages.ts`, `src/lib/scanner/mapping.ts`, landing-facts | konteks standar |
| 3 | `masalah` | Kode buatan AI cepat jadi, tapi jarang diperiksa. | AI code ships fast, rarely checked. | Veracode 45% | `problem-section.tsx` | S19 | kenapa perlu |
| 4 | `tentang` | Apa itu {NAMA}? | What is {NAMA}? | gabungan about + guard-grid | `about-section.tsx` (gabung `guard-grid.tsx`) | landing-facts | definisi setelah masalah |
| 5 | `gerbang` | Lima gerbang, diuji berurutan. | Five gates, in order. | kupon + 26 sub-langkah | `gate-coupons.tsx`, `substeps-disclosure.tsx` | STAGE_DEFINITIONS | detail dari hero |
| 6 | `pengguna` | Dibuat untuk tiga kelompok pengguna. | Built for three groups. | persona ringkas | `audience-tiles.tsx` | - | relevansi |
| 7 | `pratinjau` | Ini studionya, bukan ilustrasi. | This is the studio. | screenshot asli | `product-preview.tsx` | - | bukti produk |
| 8 | `cara-kerja` | Dari prompt ke rilis yang bisa diaudit | From prompt to auditable release | vignette skor 91 | `how-it-works.tsx` | `score.ts` | alur |
| 9 | `arsitektur` | Apa yang terjadi di balik layar. | Under the hood. | alur arsitektur | `architecture-flow.tsx` | - | untuk dev peduli keamanan |
| 10 | `bukti` | Angka dan metode yang bisa Anda periksa sendiri. | Numbers you can check. | tabel bukti + CSV | `proof-section.tsx` | landing-facts, S71 | target CTA sekunder |
| 11 | `hasil` | Yang Anda bawa pulang, dan yang tidak dijanjikan. | What you take home, and what we don't promise. | keluaran + batas | `deliverables.tsx` | - | kejujuran |
| 12 | `pelajari` | Pelajari istilah dan jawabannya. | Terms and answers. | glosarium + FAQ | `glossary.tsx`, `faq.tsx` | - | penutup informasi |
| 13 | `mulai` (baru, dulu tanpa id) | Mulai proyek pertama Anda | Start your first project | CTA penutup | inline `page.tsx` | - | aksi |
| 14 | - | footer | footer | tautan | `SiteFooter` | - | - |

**Sumbu standar per section:** di hero, strip standar, `#gerbang`, dan `#bukti`, ISO/IEC 27001:2022 Annex A ditulis lebih dulu sebagai sumbu utama dan NIST SSDF sebagai pelengkap; kalimatnya "dipetakan ke". Nomor A.8.25 sampai A.8.31 yang dipetakan produk diambil dari `src/lib/stages.ts` (gerbang) dan `src/lib/scanner/mapping.ts` (kategori temuan), bukan hanya dari `landing-facts.ts` (rincian di bab 6).

Dihapus: perisai hero kedua di `guard-grid` (digabung ke #4), wordmark raksasa "AMANKAN". Disimpan: `hero-shield.tsx` tidak dipakai lagi di landing; berkas tetap ada sampai M5 sebagai riwayat.

## 10. Spesifikasi hero 3D

Ringkasan dari `konsep-hero-3d.md`, Konsep 2.

**Konsep.** Mesin pembaca pita di atas meja. Pita diff (kode dari AI) bergerak kiri ke kanan di bawah lima kepala baca berurutan. Kepala 4 mewakili Semgrep + Trivy: rem menjepit pita saat baris rentan lewat, odometer turun 100 → 96 → 92 → 91. Setelah revisi, rem lepas dan cap kontrol tercetak di margin.

**Part list (58):** base 11 (meja, 4 kaki karet, 4 sekrup, pelat label, strip penggaris), structure 11 (2 tiang, 2 as, jembatan, 5 braket, pelindung debu), mechanism 23 (2 gulungan, 4 rol pemandu, capstan, rol penekan, 5 kepala, 5 lensa, rem, pegas rem, 3 drum odometer), controls 8 (kenop pengencang, sakelar arah, stempel cap, 5 lampu baca), subject 5 (pita, 3 penanda baris, cap kontrol).

**Scene graph:**

```
HeroTape (server)
├─ svg.back   : meja, kaki, tiang belakang, gulungan suplai belakang
├─ svg.tape   : segmen pita 0..5 (dipotong di antara kepala), FaceText baris kode
├─ svg.heads  : braket, kepala 1..5, lensa, tutup warna --stage-n, hallmark
├─ svg.front  : rol penekan, rem, gulungan depan, pelindung debu, odometer
└─ HeroTapeLive (client): menulis atribut transform/data-state per frame
```

**Material dan tone:** 4 nada kit (lo/mid/hi/lit). Base `lo`, struktur `mid`, kepala `hi`, aksen `lit` = baris yang sedang dibaca. Pita memakai `--tape-paper`; baris tertangkap memakai `--finding-medium` / `--finding-low` (bagian 13).

**Kamera:** azimut 35°, elevasi 32°, `fitProjection` ke kotak 760×590.

**Timeline scroll (pin di `#main`):**

| Progres | Pita (px dunia) | Kepala | Rem | Odometer | Copy |
|---|---|---|---|---|---|
| 0% | 0 | semua gelap | lepas | 100 | Prompt pengguna masuk: kartu prompt tampil di ujung kiri pita yang masih kosong. Copy: "Tulis prompt; AI membangun websitenya." |
| 25% | 220 | 1–3 menyala berurutan | lepas | 100 | Kode hasil AI tercetak di pita saat melewati kepala 1–3 (analisis, desain, kode). Copy: "AI menulis kodenya, gerbang 1–3 mencatat urutannya." |
| 50% | 330 | 4 menyala | jepit | 91 (100→96→92→91) | Semgrep dan Trivy menemukan 2 medium dan 1 low. |
| 75% | 330 → 400 | 4 tetap | lepas | 91; cap A.8.29 · PW.8.1 | Diperbaiki, lalu dipetakan ke kontrol ISO/IEC 27001:2022 (dan NIST SSDF). |
| 100% | 560 | 5 menyala | lepas | 91 | Bawa pulang kodenya, beserta buktinya. |

Urutan 0–25% (putaran 3): prompt masuk lebih dulu, lalu kode hasil AI tercetak di kepala 1–3, baru kepala 4 memindai. Mekanisme, part list, dan skor konsep tidak berubah; yang berubah hanya urutan adegan dan copy.

Keadaan adalah fungsi murni progres. Gulir balik memutar timeline mundur dengan nilai yang sama.

**State interaksi:** `idle` (sebelum masuk viewport, pose 0%), `scrub` (pin aktif), `done` (lepas pin, pose 100%), `still` (reduced motion: pose 50%), `poster` (Tier 0). Tidak ada hover yang mengubah makna.

**Fallback 4 tier:**

| Tier | Kapan | Isi | JS tambahan |
|---|---|---|---|
| 0 | no-JS, `prefers-reduced-motion: reduce`, < 1024 px, `pointer: coarse` | poster SVG server pose 50% + tabel temuan HTML | 0 B |
| 1 | ≥ 1024 px, `pointer: fine`, motion diizinkan | SVG + GSAP ScrollTrigger + Lenis | 52 434 B gz |
| 2 | tidak dipakai untuk Pita Pindai | - | - |
| 3 | ditolak | three.js + r3f | ≈ 243 351 B gz, tidak dibangun |

**Budget:** SVG poster inline ≤ 40 kB HTML; hero tidak boleh menjadi elemen LCP; satu Client Component.

## 11. Spesifikasi motion

| Elemen | Trigger | Durasi | Easing | Reduced motion | Mobile | Scroller / catatan |
|---|---|---|---|---|---|---|
| Hero pita, kepala, rem, odometer | ScrollTrigger `pin: true`, `scrub: 0.6`, `end: "+=1600"` | terikat scroll | `none` (scrub) | pose 50% statis | poster | `scroller: "#main"` |
| Lampu kepala | bagian dari timeline hero | - | `power2.out` | statis menyala | poster | - |
| Section masuk (judul H2) | ScrollTrigger `start: "top 80%"`, sekali | 0,4 s | `power2.out` | tanpa animasi | tanpa animasi | `scroller: "#main"`, `once: true` |
| Count-up angka bukti | IntersectionObserver yang ada (`count-up.tsx`) | tetap | tetap | angka akhir | angka akhir | tidak dipindah ke GSAP |
| Kursor ketik vignette | dihentikan | - | - | mati | mati | memperbaiki temuan audit WCAG 2.2.2 |

**Init Lenis untuk `#main`** (S16, S18):

```ts
const main = document.getElementById("main")!;
const lenis = new Lenis({
  wrapper: main,
  content: document.getElementById("main-content")!, // pembungkus baru untuk children + footer
  autoRaf: false,
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
ScrollTrigger.defaults({ scroller: main });
```

Prasyarat layout: `#main` diberi `position: relative` agar `span.sr-only` tidak lagi membuat `window` bisa di-scroll 1 832 px (S38), dan isi `#main` dibungkus satu `div#main-content`.

**Aturan anti scroll-jacking:**

1. Pin hero maksimal 1 600 px gulir (≈ 2 layar); tidak ada pin lain di halaman.
2. Tanpa snap, tanpa `scrollTo` otomatis, tanpa mengubah kecepatan wheel di luar `lerp` bawaan Lenis.
3. Anchor link (`#bukti`, `#gerbang`) melompat langsung; Lenis `anchors: true`.
4. Lenis hanya di landing; dihancurkan (`lenis.destroy()`) saat route berubah. Dashboard dan studio memakai scroll native.
5. Di React StrictMode, init di `useEffect` dengan cleanup `ScrollTrigger.getAll().forEach(t => t.kill())` dan `lenis.destroy()`.

**Tidak dianimasikan:** H1, lede, CTA, tabel temuan, tabel bukti, FAQ, header, footer, seluruh dashboard di luar transisi yang sudah ada.

## 12. ATM dashboard

Wireframe: `wireframe-dashboard-v2.png` (frame `dashboard-v2-1440`, wordmark `{NAMA}`).

| Area | Referensi asal | Ditiru | Diubah | Tidak boleh berubah |
|---|---|---|---|---|
| Layout dan header | Vercel (02), Cursor (10) | header lengket tipis | wordmark `{NAMA}` | rute `/[lang]/dashboard`, view-transition header |
| Kartu statistik (4) | Railway (07) | ringkasan di atas daftar | tanpa animasi hitung | sumber angka dari query proyek |
| Kartu proyek | Linear (01), Clerk (06) | status padat per baris | rail 5 gerbang memakai `--stage-1..5` | props `ProjectList`, `layoutId` `project-title-<id>` |
| Progres gerbang | konsep Pita Pindai | lima segmen berwarna temper | segmen aktif bergaris tepi | urutan gerbang dari `STAGE_DEFINITIONS` |
| Skor | Snyk (08) | angka besar + sumber | "Semgrep + Trivy, 2 hari lalu" atau "belum dipindai"; label teks di samping warna | rumus `score.ts` |
| Empty state | Resend (05) | satu objek ilustratif | poster Tier 0 kecil dari hero + 3 langkah | tidak ada angka palsu |
| Search + filter | Raycast (03) | `/` memfokuskan pencarian | filter gerbang aktif | parameter URL yang ada |

Monaco di studio tetap tanpa leluhur ber-`transform`; tidak ada perubahan pada studio.

## 13. Design tokens

| Token | Nilai lama | Nilai baru | Alasan | Dipakai di |
|---|---|---|---|---|
| `--stage-1..5` (dark) | #d9b45e, #d08a4e, #b394db, #86ace0, #9cadbd | tetap | identitas temper dipertahankan (menunggu keputusan pemilik) | tutup kepala, rail, kupon |
| `--stage-1..5` (light) | #8a6812, #9f622d, #6e4a93, #2f5e9e, #5e6f80 | tetap | idem | idem |
| `--tape-paper` | - | dark #ede6d3, light #f6f1e3 | latar pita yang bisa memuat teks gelap di kedua tema | pita hero |
| `--tape-ink` | - | #222222 | kontras ≥ 7:1 di atas `--tape-paper` (dicek di M2) | baris kode di pita |
| `--finding-medium` | - | #f7c6c6 (latar baris) | sorotan baris tertangkap; selalu dengan label teks | pita, tabel temuan |
| `--finding-low` | - | #f5d9a8 | idem | idem |
| `--brake` | - | #e5484d | rem dan lampu tahan | hero |
| `--odometer-bg` | - | #0f1226 | drum angka | hero |

Nilai `--stage-*` dibaca dari `src/app/globals.css` (S97). Hallmark segi-4, lingkar, segitiga, persegi, segilima tetap dipakai di muka kepala baca dan kupon gerbang.

## 14. Aksesibilitas (WCAG 2.2)

| SC | Level | Penerapan | Cara uji |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | teks pita, tabel temuan, CTA ≥ 4,5:1 | axe + pemeriksa kontras pada token bagian 13 |
| 1.4.11 Non-text Contrast | AA | tepi kepala, rem, segmen rail ≥ 3:1 | pemeriksa kontras |
| 2.2.2 Pause, Stop, Hide | **A** | hero hanya bergerak karena scroll (tidak otomatis); kursor ketik dihentikan (S24) | Playwright: tanpa scroll, `getAnimations()` kosong setelah 5 s |
| 2.3.3 Animation from Interactions | **AAA** | reduced motion → pose 50% statis, Lenis `respectReducedMotion` (S15, S23) | Playwright `reducedMotion: "reduce"` |
| 2.4.7 Focus Visible | AA | fokus terlihat di CTA dan tabel | keyboard manual |
| 2.5.8 Target Size (Minimum) | AA | target ≥ 24×24 CSS px (S25) | skrip ukuran target |
| 3.2.2 On Input | A | scroll tidak memindahkan fokus | keyboard manual |

Figur hero `aria-hidden="true"`; informasinya ada di tabel temuan HTML di bawah panggung (judul, severity, penalti, skor).

## 15. Performa

| Metrik | Budget | Baseline (dev) | Cara ukur |
|---|---|---|---|
| LCP | ≤ 2,5 s, elemen H1 | 1 364 ms, H1 (S37) | Lighthouse produksi |
| CLS | ≤ 0,1 | 0 (S37) | Lighthouse |
| INP | ≤ 200 ms | belum diukur | Lighthouse timespan |
| JS tambahan landing desktop | ≤ 52 434 B gz | 0 | analisis chunk CI |
| JS tambahan mobile | 0 B | 0 | analisis chunk + `matchMedia` gate |
| HTML hero (poster inline) | ≤ 40 kB | 39 282 B dokumen penuh (dev, audit-landing.md bagian 4) | ukuran respons |

Strategi: poster server-rendered; `dynamic(() => import("./hero-tape-live"), { ssr: false })` di dalam Client Component (S30), hanya bila `(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)`. Angka baseline adalah angka dev; baseline produksi diambil di M1.

## 16. Keamanan dan CSP

| Direktif | Sekarang (S31) | Kebutuhan | Perubahan |
|---|---|---|---|
| `script-src` | `'self' 'nonce-…' 'unsafe-eval'` | GSAP, Lenis, kit di-bundle | tidak ada |
| `connect-src` | `'self'` | tidak ada fetch aset hero | tidak ada |
| `media-src` | tidak ditulis (jatuh ke `default-src 'self'`) | tidak ada video | tidak ada |
| `'wasm-unsafe-eval'` | tidak ada | tidak dibutuhkan (tanpa Draco/KTX2/Rive/Spline) | tidak ditambah |
| `style-src` | `'self' 'unsafe-inline'` | GSAP menulis `style=` | tidak ada |

Aturan: semua aset konsep baru (SVG, font pita) self-host dan di-bundle; tanpa CDN; tanpa inline script baru (init di modul client yang di-bundle).

## 17. Dependensi baru

| Nama | Versi | Lisensi | Min | Gzip | Alasan | Cara muat | Alternatif ditolak |
|---|---|---|---|---|---|---|---|
| gsap | 3.15.1 | **Standard "no charge"**, bukan MIT (S03, S01) | 70 628 B | 27 434 B | timeline + ScrollTrigger | dynamic, landing desktop | Motion (sudah dipakai, tetapi tanpa pin+scrub yang setara) |
| gsap/ScrollTrigger | 3.15.1 | ikut gsap | 44 683 B | 17 991 B | pin dan scrub di `#main` | idem | - |
| lenis | 1.3.28 | MIT (S04) | 18 983 B | 5 483 B | smooth scroll di wrapper `#main` | idem | scroll native saja (cadangan bila Lenis bermasalah) |
| kit anatomy (`iso-kit`, `react/draw.tsx`, `react/live.tsx`) | salinan lokal | MIT (S14) | - | `live.tsx` 1 526 B | geometri server, gerak client | disalin ke `components/iso/` | three.js 185 679 B gz (S09), r3f 57 672 B gz (S11), Spline 36,5 MB unpacked (S13) |

## 18. Rencana MCP dan skill

Berdasarkan percobaan nyata di putaran ini (rincian dan pesan error di `laporan.md`):

| Alat | Hasil putaran 2 | Fase | Keluaran yang direncanakan | Wajib/opsional |
|---|---|---|---|---|
| figcraft | berhasil: membuka `_alat/wireframe.figcraft`, membuat 4 frame konsep + `dashboard-v2-1440`, ekspor PNG, simpan `wireframe-v2.figcraft` | M0, M2 | wireframe pose Tier 0 per progres (0/25/50/75/100) | wajib |
| kit anatomy | SKILL.md dibaca; part list, kamera, painter order Pita Pindai ditulis | M2 | figur `hero-tape`, `--audit` sampai `audit passed`, `lines.mjs` 0 | wajib |
| rea | berhasil: `inspect_web_page` landing lokal, evidence `ev_5dd0fb17…` | M1, M3 | inspeksi DOM sebelum/sesudah (`compare_web_captures`) | wajib |
| craft-anything | sebagian: `web_site_open` ditolak (consent_required); `web_page_screenshot_take` berhasil, evidence `ev_8bf72734…` | M2, M3 | screenshot + `web_pixels_compare` poster vs Tier 1 pose 50% | opsional (butuh persetujuan pemilik untuk membuka situs) |
| Playwright | berhasil (screenshot baseline 1440×900) | M1–M4 | tes Given/When/Then bagian 20 | wajib |
| chrome-devtools | tidak dipakai putaran ini | M2 | profil performa scroll | opsional |
| humanizer, antislop-copywriting | belum dijalankan | M3 | review copy ID/EN | opsional |

## 19. Milestone dan review gate

| M | Isi | Bukti | Peninjau | Gate keras |
|---|---|---|---|---|
| **M0** | pemilik memilih nama dan konsep; putuskan apakah bab/instrumen yang sudah disetujui ikut direvisi (judul tidak memuat nama, S98); putuskan identitas temper | blok keputusan terisi + tanggal | pemilik (dan pembimbing untuk judul) | M2 dan M5 tidak boleh mulai sebelum M0 |
| **M1** | carrier: salin kit anatomy, `#main` `position: relative`, `#main-content`, init GSAP + Lenis kosong; baseline produksi di worktree/CI | Lighthouse produksi; `git grep` scroller `#main`; tes window scroll = 0; **`DESIGN-BLUEPRINT.md` bagian 7.1 (motion) diperbarui** mengikuti bab 24 baris a–c | tukang-coding + mandor | LCP dan CLS tidak memburuk dibanding baseline; M1 belum selesai bila blueprint 7.1 belum diperbarui |
| **M2** | hero Pita Pindai: figur anatomy, poster Tier 0, timeline Tier 1, tabel temuan HTML | `node build.mjs --audit` = `audit passed`; `lines.mjs` = 0; screenshot 5 pose; tes reduced motion; **`DESIGN-BLUEPRINT.md` bagian 2.1 (landing) dan 2.2 (dashboard) diperbarui** | pemilik | bila audit geometri gagal 2 kali, pindah ke carrier (f) video atau Konsep 1 |
| **M3** | section: gabungan about + guard-grid, id `mulai-hero` dan `mulai`, kursor ketik dimatikan | axe 0 serius; anchor bekerja | mandor | - |
| **M4** | dashboard: kartu proyek, rail gerbang, empty state | screenshot 1440 + 390; tes props tidak berubah | pemilik | Monaco dan `layoutId` tidak berubah |
| **M5** | migrasi nama mengikuti `penamaan.md` fase 1–6 | `git grep -i` nama lama di `src/` = 0 (kecuali pengecualian tercatat); `check:dictionaries` lulus | pemilik | fase 0 di `penamaan.md` sudah disetujui |

## 20. Kriteria penerimaan

| # | Given | When | Then | Alat |
|---|---|---|---|---|
| 1 | desktop 1440×900, motion diizinkan | halaman `/id` dimuat | elemen LCP = H1 | Playwright `PerformanceObserver` |
| 2 | desktop | wheel 1 600 px di atas hero | `#main.scrollTop` bertambah, `window.scrollY` = 0 | Playwright |
| 3 | desktop | progres hero 50% | odometer menampilkan 91 dan tabel temuan memuat 3 baris | Playwright |
| 4 | desktop | gulir balik ke 0% | odometer 100, rem lepas | Playwright |
| 5 | `reducedMotion: "reduce"` | halaman dimuat dan digulir | hero pose 50% statis, `getAnimations()` kosong di hero | Playwright |
| 6 | viewport 390×844 | halaman dimuat | tidak ada request chunk gsap/lenis | Playwright network |
| 7 | JavaScript dimatikan | halaman dimuat | H1, poster hero, dan tabel temuan terlihat | Playwright `javaScriptEnabled: false` |
| 8 | keyboard saja | Tab dari awal | CTA primer menerima fokus dengan indikator terlihat sebelum konten hero lain | Playwright |
| 9 | desktop | klik tautan nav "Bukti" | `#bukti` berada di atas viewport, tanpa pin tersisa | Playwright |
| 10 | build produksi | header CSP dibaca | sama dengan S31 (tanpa `'wasm-unsafe-eval'`, tanpa domain CDN) | Playwright |
| 11 | build produksi | Lighthouse desktop | LCP ≤ 2,5 s, CLS ≤ 0,1 | Lighthouse CI |
| 12 | kode landing | `vitest landing-facts.test.ts` | stages 5, subSteps 26 tetap lulus | vitest |
| 13 | konsep terpilih | `node build.mjs --audit` pada figur hero | keluar `audit passed` | node |
| 14 | konsep terpilih | setiap unsur bergerak dibandingkan dengan tabel fakta di `konsep-hero-3d.md` | 0 unsur tanpa sumber | review manual |
| 15 | nama dipilih (M5) | `git grep -i` nama lama di `src/` | 0 hasil kecuali volume dan komentar warisan | git |
| 16 | nama dipilih (M5) | `npm run check:dictionaries` di CI | kunci id dan en identik, lulus | CI |
| 17 | copy landing | grep frasa terlarang bagian 7 | 0 hasil | grep |
| 18 | viewport 375×812 | halaman `/id` dimuat dan digulir | `ScrollTrigger.getAll()` tidak ada (modul tidak dimuat), 0 elemen `.pin-spacer`, 0 B chunk gsap/lenis; LCP sama dengan versi statis | Playwright network + DOM |
| 19 | `prefers-reduced-motion: reduce` | hero dimuat | pose 50% statis atau pose final; tabel temuan, odometer 91, dan cap tetap terlihat; tidak ada loop otomatis | Playwright `reducedMotion: "reduce"` |
| 20 | bundle dan CSS landing produksi | grep `backdrop-filter` | 0 hasil, termasuk panggung hero dan kartu hasil | grep pada keluaran build CI |
| 21 | halaman selain landing (dashboard, studio) | dimuat | tidak ada request chunk gsap/lenis | Playwright network |
| 22 | blok hook | hitung K1–K3 (bab 3) | H1 + sub-headline ≥ 2 dari 3; H1 + sub-headline + lede = 3 dari 3 | review manual, tabel centang bab 7 |
| 23 | milestone M1 dan M2 | diff `DESIGN-BLUEPRINT.md` | 7.1 berubah di M1; 2.1 dan 2.2 berubah di M2 | `git diff` |
| 24 | setiap milestone | riwayat perintah | `npm run build` tidak dijalankan di direktori utama; bukti build berasal dari worktree/CI | log CI + laporan milestone |

## 21. Risiko dan mitigasi

| # | Risiko | Mitigasi |
|---|---|---|
| 1 | scroll-jacking membuat pengguna merasa terjebak | pin ≤ 1 600 px, tanpa snap (bagian 11) |
| 2 | Lenis memakai `window` karena salah konfigurasi | `wrapper: #main`, tes kriteria 2 |
| 3 | GSAP + StrictMode init ganda | cleanup `kill()` dan `destroy()` di effect |
| 4 | proyektor ruang sidang gelap/pudar | uji tema terang; token `--tape-paper` light |
| 5 | GPU/CPU lemah di laptop penguji | tanpa kanvas; SVG transform saja; Tier 0 untuk `pointer: coarse` |
| 6 | ukuran bundle melebihi budget | analisis chunk di CI, gate M1 |
| 7 | lisensi GSAP disalahpahami sebagai MIT | tabel dependensi menulis "Standard no-charge" |
| 8 | find-in-page tidak menemukan teks di dalam pita SVG | teks sebenarnya ada di tabel temuan HTML |
| 9 | **rename setelah proposal disetujui** | judul tidak memuat nama (S98), jadi risiko turun ke bab/lampiran/instrumen; M0 mencatat keputusan revisi dokumen itu. Rename tidak menyentuh judul skripsi: yang terdampak hanya dokumen, instrumen, dan tangkapan layar yang menyebut nama produk |
| 10 | **nama bertabrakan merek** setelah dipakai | cek DJKI di M0; pemeriksaan putaran ini terbatas web/npm/GitHub |
| 11 | **konsep gagal audit geometri** anatomy | dua kali gagal → carrier (f) atau Konsep 1 |
| 12 | baris kode di pita tidak terbaca di 1024 px | maksimal 5 baris × 34 karakter, ≥ 12 px; uji di M2 |

## 22. Pertanyaan terbuka

| # | Pertanyaan | Usulan jawaban default |
|---|---|---|
| a | (ditutup putaran 3) Bolehkah judul skripsi berubah? Terjawab oleh `konteks-pemilik.md` (S98): judul tidak memuat nama produk, jadi tidak berubah. Pertanyaan yang masih terbuka: apakah nama produk perlu muncul di judul bab (bukan judul skripsi), dan apakah bab/instrumen yang sudah disetujui direvisi | default = nama produk tidak masuk judul bab; bab/instrumen direvisi dengan catatan "sebelumnya ..." |
| b | Konsep mana? | Pita Pindai |
| c | Nama mana? | Saksi, setelah cek DJKI |
| d | Apakah nama lama dipertahankan di CSV dan laporan? | CSV dan laporan baru memakai nama baru; nama lama disebut di FAQ sampai sidang; lampiran diregenerasi satu kali |
| e | Apakah identitas temper dipertahankan? | ya |
| f | Apakah Lenis benar-benar dibutuhkan bila hanya satu pin? | ya untuk kehalusan scrub di `#main`; bila M1 menunjukkan masalah, cadangan = scroll native + ScrollTrigger |
| g | Apakah tagline EN ikut diganti bersamaan dengan ID? | ya, satu commit di M5 fase 1 |
| h | Veracode edisi 2026 ada (S101). Apakah angkanya dipakai menggantikan 45% dari edisi Oktober 2025? Halaman edisi 2026 yang terbuka tanpa formulir tidak memuat angka persentase, jadi angka edisi 2026 belum diketahui | tetap 45% (edisi Oktober 2025) sampai pemilik mengunduh edisi 2026 dan angkanya dikutip dengan sumber |
| i | Tema "Dark Clay" (default) dan "Light Clay" dipertahankan? | ya (usulan default bab 24 baris h) |

## 23. Lampiran

**Wireframe (figcraft, `wireframe-v2.figcraft`):**

| Berkas | Frame |
|---|---|
| `wireframe-konsep-1.png` | `konsep-1-pintu-sluis-1440` |
| `wireframe-konsep-2.png` | `konsep-2-pita-pindai-1440` |
| `wireframe-konsep-3.png` | `konsep-3-benang-bukti-1440` |
| `wireframe-konsep-4.png` | `konsep-4-silinder-pin-1440` |
| `wireframe-dashboard-v2.png` | `dashboard-v2-1440` |

**Matriks skor konsep** (`konsep-hero-3d.md`): K1 89,5; K2 90,5; K3 82; K4 75,5.

**Matriks nama** (`penamaan.md`): Saksi 27, Tilik 25, Tapis 24, Sahih 23, Sidik 23, Segel 22, Lolos 22, Attesta 22, Sahkan 22, Telaah 20.

**Tabel sumber utama:**

| Klaim | Sumber |
|---|---|
| Veracode 45% | S19 |
| Pearce ≈ 40%, Perry | S21, S22 |
| Angka bundle | S05, S06, S07, S09, S11, S14 |
| Lisensi GSAP, Lenis | S01, S03, S04 |
| Lenis wrapper/content, integrasi ScrollTrigger, reduced motion | S15, S16, S18 |
| WCAG 2.2.2, 2.3.3, 2.5.8 | S24, S23, S25 |
| LCP/CLS/INP | S26, S27, S28 |
| CSP | S31 |
| `#main` sebagai scroller | S32, S38 |
| Fakta produk | S33, S36, S78–S81 |
| Judul skripsi resmi | S98 |
| Landmine rename | S69–S77 |
| Referensi ATM | S85–S96 |
| Nomor Annex A 2022 (A.8.25–A.8.31) | S99, S100 |
| Lokasi pemetaan di kode (stages, mapping, layout, landing-facts, seed) | S102–S105 |
| Keputusan lama yang ditimpa (blueprint, AGENTS.md, CSP) | S106–S108 |
| Veracode edisi 2026 | S101 |

**Cap dan baris temuan Pita Pindai** (dibaca ulang dari kode HEAD d6da5f8, `_alat/kutipan-kode-v3.txt`):

| Yang ditampilkan | Pasangan standar | Bukti di kode |
|---|---|---|
| Cap gerbang 4 di pita | `A.8.29 - PW.8.1` | `src/lib/landing-facts.ts:42` dan `prisma/seed.ts:98` (S105) |
| Baris temuan injeksi/XSS pada tabel temuan | `A.8.28 - PW.4.1` | `src/lib/scanner/mapping.ts:23-24` (S103) |
| (bila ditampilkan) baris dependency | `A.8.8 / A.8.29 - PW.7.2` | `src/lib/scanner/mapping.ts:26` (S103) |

Cap gerbang memakai `GATE_MAPPING` (PW.8.1), sedangkan baris temuan memakai pemetaan kategori di `mapping.ts` (PW.7.2 untuk dependency). Dua sumber ini berbeda dan tetap dibiarkan berbeda.

**Glosarium:**

| Istilah | Arti |
|---|---|
| SSDF | NIST SP 800-218 Secure Software Development Framework |
| Gerbang | satu dari lima tahap berurutan: analysis, design, development, testing, handover |
| Temper | lima warna baja (205/260/282/310/371 °C) yang dipakai sebagai warna gerbang |
| Hallmark | lima bentuk penanda gerbang: segi-4, lingkar, segitiga, persegi, segilima |
| Carrier | cara teknis menggambar hero (opsi a–f di `rekomendasi-3d.md`) |
| Tier 0–3 | tingkat fallback hero |
| Pin / scrub | ScrollTrigger menahan elemen di layar dan mengikat timeline ke posisi scroll |

**Riwayat:** v1 (2026-11-26) memakai nama ShieldForge dan konsep Forge Line (perisai melewati lima stasiun temper); keduanya dibatalkan oleh spek-v2.

## 24. Keputusan lama yang ditimpa

PRD ini menimpa sebagian keputusan di `DESIGN-BLUEPRINT.md` dan PRD claymorphism 2026-11-25. Tabel di bawah menyebut mana yang ditimpa, mana yang ditegaskan, dan batas aman yang bisa diuji. Kutipan blueprint dibatasi satu kalimat per baris; lokasi baris dibaca dari repo HEAD d6da5f8 (`_alat/kutipan-kode-v3.txt`).

| # | Keputusan lama | Sumber | Putusan sekarang | Batas aman yang bisa diuji | Cara membuktikan |
|---|---|---|---|---|---|
| a | "No smooth-scroll library, no GSAP" dan animasi terikat scroll tidak dipakai | `DESIGN-BLUEPRINT.md:677` (S106), PRD claymorphism 2026-11-25 (S35) | **Ditimpa.** GSAP + Lenis dipakai hanya di landing | hanya landing; hanya `>= 1024 px` dan `pointer: fine`; scroller `#main`; di bawah 1024 px atau pointer kasar, 0 B JS motion dimuat (modul tidak diunduh, bukan sekadar dinonaktifkan); halaman lain tidak memuat gsap/lenis | Playwright network di 1440×900 dan 375×812 (kriteria 6, 18, 21); `git grep -n "scroller" src/` hanya menunjuk `#main`; analisis chunk CI: gsap/lenis hanya di chunk landing |
| b | Motion landing hanya desktop ("its entrance is CSS, desktop-only") | `DESIGN-BLUEPRINT.md:113` (S106), S35 | **Ditegaskan** sebagai aturan tertulis, bukan warisan tak sengaja | di 375 px tidak ada `ScrollTrigger` aktif, tidak ada `.pin-spacer`, LCP sama dengan versi statis | Playwright 375×812: `document.querySelectorAll('.pin-spacer').length === 0`, tidak ada request gsap; Lighthouse mobile dibandingkan dengan baseline M1 (kriteria 18) |
| c | Reduced motion belum dinyatakan untuk animasi terikat scroll | WCAG 2.2 SC 2.2.2 (A) dan 2.3.3 (AAA) (S24, S23) | **Kurangi gerak, bukan hapus informasi** | `prefers-reduced-motion: reduce` menghasilkan pose 50% statis atau pose final; fade dan perubahan warna tetap boleh; tidak ada elemen informasi yang hilang (tabel temuan, odometer 91, cap tetap); tidak ada loop otomatis | Playwright `reducedMotion: "reduce"`: `getAnimations()` kosong di hero setelah 5 s, tabel temuan memuat 3 baris (kriteria 5, 19) |
| d | Tanpa `backdrop-blur` ("No backdrop blur; glow is `box-shadow` only") | `DESIGN-BLUEPRINT.md:135` (S106) | **Ditegaskan** | nol `backdrop-filter` di CSS dan bundle landing, termasuk panggung hero dan kartu hasil | grep `backdrop-filter` dan `backdrop-blur` pada `src/components/landing`, `src/app/globals.css`, dan keluaran build CI = 0 (kriteria 20) |
| e | CSP self-host: `script-src 'self' 'nonce-…' 'unsafe-eval'` (lengkap di bab 16), `connect-src 'self'` | `src/proxy.ts:49`, `:55` (S108, S31) | **Ditegaskan**, tanpa CDN dan tanpa `wasm-unsafe-eval` | nol permintaan pihak ketiga di landing; nol WASM; nol inline script baru tanpa nonce | Playwright: semua request landing ber-origin sama; header CSP sama dengan S31 (kriteria 10); grep `wasm-unsafe-eval` di `src/proxy.ts` = 0 |
| f | Build produksi hanya di CI atau worktree terpisah ("Run production builds in CI or a separate clone/worktree.") | `AGENTS.md:20-21` (S107) | **Ditegaskan** | `npm run build` tidak dijalankan di direktori utama pada milestone mana pun; bukti build dilampirkan dari worktree/CI | laporan tiap milestone melampirkan log CI atau path worktree; riwayat perintah di direktori utama tidak memuat `npm run build`/`next build` (kriteria 24) |
| g | Blueprint belum mencerminkan keputusan baru (masih memuat larangan GSAP di :677) | `DESIGN-BLUEPRINT.md:627` (7.1), `:111` (2.1), `:139` (2.2) (S106) | **Diperbarui di milestone yang sama** | M1 memperbarui `DESIGN-BLUEPRINT.md` bagian 7.1 (motion); M2 memperbarui 2.1 (landing) dan 2.2 (dashboard); keduanya kriteria selesai milestone (bab 19), bukan tugas lepas | `git diff` blueprint pada commit M1 dan M2 (kriteria 23) |
| h | Tema "Dark Clay" (default) dan "Light Clay" mengikuti toggle tema | `DESIGN-BLUEPRINT.md:113` (S106) | **Usulan default: dipertahankan.** Keputusan akhir di tangan pemilik (bab 22 butir i) | bila dipertahankan: token claymorphism (`.clay-card`, `.clay-btn`, `.clay-chip`, `.coupon`), 5 warna temper (205/260/282/310/371 °C, `--stage-1..5`), dan hallmark segi-4/lingkar/segitiga/persegi/segilima tetap; token Pita Pindai (`--tape-*`, `--finding-*`, `--brake`, `--odometer-bg`, bab 13) ditambahkan di atasnya. Bila diubah: `.clay-*` dan latar navy/lavender dibuang dan diganti token permukaan baru, tetapi `--stage-1..5` dan hallmark tetap karena dipakai kepala baca, rail, dan kupon | `src/lib/contrast.test.ts` tetap lulus di CI; grep `--stage-` di `src/app/globals.css` tidak berkurang; screenshot landing Dark Clay dan Light Clay di M2 |

**Yang tidak berubah, dan alasannya.** Larangan testimoni, logo klien, award, dan angka pengguna ("No testimonials, customer logos, awards or blog", `DESIGN-BLUEPRINT.md:113`) tetap berlaku, begitu juga larangan klaim sertifikasi dan kepatuhan (bab 7). Alasannya: produk adalah proyek skripsi tanpa pengguna produksi, dan hero hanya boleh menggambar fakta yang ada di kode. Larangan ini tidak ditimpa oleh motion baru; ia justru menjadi syarat konten hero.
