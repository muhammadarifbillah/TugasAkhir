# Riset Referensi dan ATM (Amati, Tiru, Modifikasi)

Data diambil oleh tukang putaran 1 pada 2026-11-26 dengan Playwright (viewport 1440×900, satu tangkapan saat dimuat dan satu setelah scroll 2 700 px) dan disimpan di `_alat/ref-NN.json` serta `ref-NN.png`. Putaran 2 menulis data itu menjadi dokumen; situs tidak dibuka ulang. Sumber per referensi: S85–S96 di `sumber.json`.

Cara membaca kolom teknis:

- **Canvas/engine**: elemen `<canvas>` yang ada di DOM dan, bila terdeteksi, nama engine yang dilaporkan halaman. "engine tidak terdeteksi" berarti tidak ada bukti library; bukan berarti tanpa WebGL.
- **Sticky / pin-spacer / Lenis**: jumlah elemen `position: sticky`, jumlah `.pin-spacer` (penanda ScrollTrigger pin), dan ada tidaknya kelas `lenis` di `<html>`. Global `gsap`, `THREE`, `Lenis` bernilai `false` di 12 situs; artinya library tidak diekspos ke `window`, bukan bukti tidak dipakai.
- **Logo / testimoni**: hitungan heuristik dari skrip v1 (gambar berpola logo, teks berpola kutipan). Angka ini perkiraan kasar.

Aturan Modifikasi untuk produk ini: tidak ada logo klien, testimoni, angka pengguna, atau award. Padanan jujurnya: tabel bukti, skor dengan rumus, kode NIST/ISO, screenshot studio asli.

## Ringkasan

| # | Situs | H1 | Objek hero (dari data) | Pola scroll (dari data) | Bukti di halaman |
|---|---|---|---|---|---|
| 01 | linear.app | The product development system for teams and agents | 0 canvas, 0 video; 228 SVG | 0 sticky, 0 pin | logo 2, testimoni 3 |
| 02 | vercel.com | Agentic Infrastructure | 1 canvas 1080×720 (opacity-0 saat dimuat) | 2 sticky | logo 0, testimoni 0 |
| 03 | raycast.com | Your shortcut to everything. | 1 canvas 1200×967, **three.js r186** | 0 sticky | logo 0, testimoni 0 |
| 04 | supabase.com | Build in a weekend Scale to millions | video webm table editor (muncul setelah scroll) | 1 sticky | logo 2 |
| 05 | resend.com | Email for developers | canvas 648×550 + `cube.splinecode` + `cube.mp4` | 1 sticky | testimoni 31 |
| 06 | clerk.com | Everything you need for authentication | canvas 400×566 | 1 sticky | logo 1 |
| 07 | railway.com | Let agents ship products as fast as they write code | canvas 1432×647 jauh di bawah hero | 3 sticky | logo 19 setelah scroll |
| 08 | snyk.io | Unleash AI Innovators – Securely | video Cloudinary (di bawah hero) | 2 sticky | logo 16, testimoni 5 |
| 09 | semgrep.dev | Code Security for Builders and Agents | canvas Rive `home-hero-2611a.riv` + `rive.wasm` | 2 sticky | logo 14, testimoni 3 |
| 10 | cursor.com | Cursor is your coding agent for building ambitious software. | video logo mp4 | 7 sticky | testimoni 6 |
| 11 | warp.dev | The software factory infrastructure platform | canvas `roi-chart` di bawah | 1 sticky | logo 0 |
| 12 | socket.dev | (halaman tantangan Cloudflare) | tidak terbaca | tidak terbaca | tidak terbaca |

Pola yang terlihat: tidak satu pun dari 11 situs yang terbaca memasang `.pin-spacer` atau kelas `lenis`; hanya satu (Raycast) yang menunjukkan three.js; dua memakai format animasi pra-produksi (Spline di Resend, Rive di Semgrep); sisanya mengandalkan SVG, mockup, dan video. Hero 3D runtime adalah pengecualian, bukan norma.

---

## 01. Linear

| Field | Isi |
|---|---|
| URL | https://linear.app (diakses 2026-11-26, S85) |
| Screenshot | `ref-01.png` |
| Hook hero | "The product development system for teams and agents" |
| Objek/efek | 0 canvas, 0 video; 228 SVG di DOM. Hero berupa tipografi dan mockup antarmuka, bukan 3D runtime. |
| Pola scroll | 0 sticky, 0 pin-spacer, tanpa kelas Lenis. |
| Bukti | logo 2, petunjuk testimoni 3. Testimoni **tidak boleh ditiru**. |
| Amati | Mockup produk berlapis menjadi pusat hero; tipografi besar, kontras rendah di latar. |
| Tiru | Produk sendiri sebagai bukti visual pertama. |
| Modifikasi (landing) | Screenshot studio asli (`product-preview.tsx`) tetap di bawah hero; hero memakai konsep 3D, studio menjadi bukti kedua. |
| Modifikasi (dashboard) | Kepadatan informasi daftar proyek ala daftar issue: satu baris status per gerbang di kartu proyek. |

## 02. Vercel

| Field | Isi |
|---|---|
| URL | https://vercel.com (S86) |
| Screenshot | `ref-02.png` |
| Hook hero | "Agentic Infrastructure" |
| Objek/efek | 1 canvas 1080×720 di belakang hero, class awal `opacity-0` (muncul bertahap); engine tidak terdeteksi. |
| Pola scroll | 2 sticky, 0 pin-spacer. |
| Bukti | logo 0, testimoni 0 pada tangkapan. |
| Amati | Efek latar dimulai transparan lalu muncul; teks hero tidak menunggu kanvas. |
| Tiru | Hero tetap terbaca sebelum efek siap (H1 tetap elemen LCP). |
| Modifikasi (landing) | Tier 0 poster dirender server; Tier 1 hanya menambah gerak, tidak menunda H1. |
| Modifikasi (dashboard) | Header lengket tipis dengan navigasi Dasbor/Pengaturan, tanpa efek. |

## 03. Raycast

| Field | Isi |
|---|---|
| URL | https://www.raycast.com (S87) |
| Screenshot | `ref-03.png` (percobaan pertama timeout 30 s, berhasil di percobaan kedua) |
| Hook hero | "Your shortcut to everything." |
| Objek/efek | 1 canvas 1200×967 di atas, engine dilaporkan **three.js r186**. |
| Pola scroll | 0 sticky, 0 pin-spacer; dokumen 16 045 px. |
| Bukti | logo 0, testimoni 0. |
| Amati | Satu-satunya referensi dengan three.js runtime; halaman berat (124 gambar). |
| Tiru | Objek 3D yang mewakili produk (keyboard/launcher), bukan dekorasi abstrak. |
| Modifikasi (landing) | Objek mewakili mekanisme produk (Pita Pindai), dibangun SVG anatomy, bukan three.js (185 679 B gz ditolak, S09). |
| Modifikasi (dashboard) | Palet perintah (tekan `/` untuk mencari proyek) sudah ada di wireframe dashboard. |

## 04. Supabase

| Field | Isi |
|---|---|
| URL | https://supabase.com (S88) |
| Screenshot | `ref-04.png` |
| Hook hero | "Build in a weekend Scale to millions" |
| Objek/efek | tanpa canvas; video webm table editor (autoplay, loop, poster) muncul setelah scroll di y ≈ 1 969. |
| Pola scroll | 1 sticky. |
| Bukti | logo 2. Angka skala tidak boleh ditiru tanpa data. |
| Amati | Rekaman produk asli dipakai sebagai bukti di bawah hero. |
| Tiru | Video/gambar produk asli dengan poster. |
| Modifikasi (landing) | Section `#pratinjau` tetap screenshot studio; video tidak ditambah (CSP media-src jatuh ke `'self'`, aset harus self-host). |
| Modifikasi (dashboard) | Tabel ringkas proyek seperti table editor sebagai mode tampilan kedua (opsional, bukan M4). |

## 05. Resend

| Field | Isi |
|---|---|
| URL | https://resend.com (S89) |
| Screenshot | `ref-05.png` |
| Hook hero | "Email for developers" |
| Objek/efek | canvas 648×550 + aset `cube.splinecode` (Spline) + `cube.mp4` autoplay loop dengan poster. |
| Pola scroll | 1 sticky. |
| Bukti | petunjuk testimoni 31 (banyak kutipan). Tidak ditiru. |
| Amati | Objek 3D tunggal (kubus) + video cadangan. |
| Tiru | Satu objek 3D yang jelas, dengan fallback non-WebGL. |
| Modifikasi (landing) | Fallback = poster SVG statis Tier 0, bukan video; Spline ditolak (36,5 MB unpacked, S13; CSP connect-src). |
| Modifikasi (dashboard) | Empty state memakai poster Tier 0 kecil dari hero. |

## 06. Clerk

| Field | Isi |
|---|---|
| URL | https://clerk.com (S90) |
| Screenshot | `ref-06.png` |
| Hook hero | "Everything you need for authentication" |
| Objek/efek | canvas 400×566 di y 527 (hilang setelah scroll); 155 gambar, 254 SVG; komponen UI ditampilkan sebagai produk. |
| Pola scroll | 1 sticky. |
| Bukti | logo 1. |
| Amati | Komponen produk (form login) dipamerkan langsung. |
| Tiru | Potongan UI nyata sebagai bukti. |
| Modifikasi (landing) | Tabel temuan dan kartu skor dari studio tampil di bawah panggung hero (Konsep 2). |
| Modifikasi (dashboard) | Kartu proyek memakai komponen yang sama dengan studio (skor, status gerbang). |

## 07. Railway

| Field | Isi |
|---|---|
| URL | https://railway.com (S91) |
| Screenshot | `ref-07.png` |
| Hook hero | "Let agents ship products as fast as they write code" |
| Objek/efek | canvas 1432×647 di y 1 306 (bukan hero); skrip `use-motion-value` (Motion). |
| Pola scroll | 3 sticky; dokumen tumbuh dari 2 490 ke 12 484 px setelah scroll (konten dimuat bertahap). |
| Bukti | logo 19 setelah scroll. Tidak ditiru. |
| Amati | Hero ringan, efek berat ditunda ke bawah. |
| Tiru | Muat efek hanya saat terlihat. |
| Modifikasi (landing) | Komponen hero client di-`dynamic()` dengan `ssr: false` di dalam Client Component (S30), dimuat setelah H1. |
| Modifikasi (dashboard) | Statistik ringkas di atas (4 kartu) tanpa animasi hitung. |

## 08. Snyk

| Field | Isi |
|---|---|
| URL | https://snyk.io (S92) |
| Screenshot | `ref-08.png` |
| Hook hero | "Unleash AI Innovators – Securely" |
| Objek/efek | tanpa canvas; video Cloudinary loop dengan poster di y ≈ 2 026. |
| Pola scroll | 2 sticky. |
| Bukti | logo 16, testimoni 5. Tidak ditiru. |
| Amati | Pesaing langsung di AI security; bahasa "securely" tanpa bukti di hero. |
| Tiru | Menyebut AI dan keamanan di H1. |
| Modifikasi (landing) | H1 menyebut mekanisme yang bisa dibuktikan (gerbang, pemindai, skor), bukan kata sifat "aman". |
| Modifikasi (dashboard) | Severity berwarna di kartu proyek, dengan label teks (bukan warna saja). |

## 09. Semgrep

| Field | Isi |
|---|---|
| URL | https://semgrep.dev (S93) |
| Screenshot | `ref-09.png` |
| Hook hero | "Code Security for Builders and Agents" |
| Objek/efek | canvas Rive (`rive rive-canvas`, 1170×334) dengan `home-hero-2611a.riv` dan `rive.wasm` dari unpkg. |
| Pola scroll | 2 sticky. |
| Bukti | logo 14, testimoni 3. Tidak ditiru. |
| Amati | Hero animasi pemindaian kode; runtime WASM dari CDN. |
| Tiru | Animasi yang memperlihatkan kode dipindai. |
| Modifikasi (landing) | Pita Pindai menggambar pemindaian tanpa WASM (CSP tidak punya `'wasm-unsafe-eval'`, S31) dan tanpa CDN. Semgrep juga pemindai yang dipakai produk (S36), jadi kata "Semgrep" boleh muncul sebagai fakta. |
| Modifikasi (dashboard) | Daftar temuan per proyek dengan kolom berkas:baris. |

## 10. Cursor

| Field | Isi |
|---|---|
| URL | https://cursor.com (S94) |
| Screenshot | `ref-10.png` |
| Hook hero | "Cursor is your coding agent for building ambitious software." |
| Objek/efek | video logo mp4 kecil di header; tanpa canvas. |
| Pola scroll | 7 sticky. |
| Bukti | testimoni 6. Tidak ditiru. |
| Amati | Hero = pernyataan produk + rekaman editor. |
| Tiru | H1 menyebut apa yang dilakukan produk dalam satu kalimat. |
| Modifikasi (landing) | H1 menyebut kode AI dan bukti; generator AI (termasuk Cursor) diposisikan sebagai sumber kode yang diperiksa, bukan pesaing. |
| Modifikasi (dashboard) | Navigasi ringkas, banyak sticky header untuk daftar panjang. |

## 11. Warp

| Field | Isi |
|---|---|
| URL | https://www.warp.dev (S95) |
| Screenshot | `ref-11.png` |
| Hook hero | "The software factory infrastructure platform" |
| Objek/efek | canvas `roi-chart` di y 6 271 (grafik, bukan hero). |
| Pola scroll | 1 sticky. |
| Bukti | logo 0. |
| Amati | Metafora "pabrik" untuk alur pengembangan. |
| Tiru | Metafora mesin produksi untuk alur kerja. |
| Modifikasi (landing) | Mesin pembaca pita (Konsep 2) atau jalur sluis (Konsep 1), dengan angka produk asli. |
| Modifikasi (dashboard) | Grafik skor per revisi hanya bila datanya ada di proyek. |

## 12. Socket

| Field | Isi |
|---|---|
| URL | https://socket.dev (S96) |
| Screenshot | `ref-12.png` (halaman tantangan Cloudflare, HTTP 403, judul "Just a moment...") |
| Hook hero | tidak terbaca |
| Objek/efek | tidak terbaca |
| Pola scroll | tidak terbaca |
| Bukti | tidak terbaca |
| Amati | Situs menolak browser headless. |
| Tiru | - |
| Modifikasi (landing) | tidak ada; referensi ini tidak dipakai untuk keputusan apa pun. |
| Modifikasi (dashboard) | - |

## Tabel pengganti jujur

| Pola di referensi | Pengganti di produk ini |
|---|---|
| Logo klien | chip standar (NIST SSDF, ISO 27001, Semgrep, Trivy) sebagai teks, bukan logo |
| Testimoni | contoh laporan nyata: tabel temuan, skor 91, CSV matriks |
| Angka pengguna / skala | angka dari `landing-facts.ts`: 5 gerbang, 42 task, 26 sub-langkah, 6 provider, 2 bahasa |
| Award | tidak ada padanan; tidak diganti |
| Video produk dari CDN | screenshot studio self-host |
