# Rekomendasi 3D Hero ShieldForge

> **Catatan putaran 2 (2026-11-26).** Bagian 3 ("Keputusan: Forge Line") dibatalkan oleh spek-v2: perisai tidak lagi menjadi objek hero wajib dan nama konsep Forge Line tidak dipakai. Keputusan konsep sekarang ada di `konsep-hero-3d.md` (rekomendasi: Pita Pindai, carrier (b) tanpa layer WebGL, dinilai ulang 94). Bagian 1, 2, 4, dan 5 tetap berlaku sebagai data carrier; sebutan "Forge Line" dan "perisai" di bagian 4 dan 5 dibaca sebagai "konsep terpilih". Nama produk di judul dokumen ini adalah nama lama (riwayat).

Tanggal 2026-11-26. Semua angka ukuran punya entri di `sumber.json` (S-id di kolom "Sumber"). Angka yang diukur sendiri ada di `_alat/ukur-gzip.txt` dan `_alat/ukur-anatomy.txt`.

## 1. Angka bundle nyata

| Paket | Versi | Lisensi | Min | Gzip | Sumber |
|---|---|---|---|---|---|
| gsap (inti) | 3.15.1 | Standard "no charge" (bukan MIT) | 70 628 B (bundlephobia); 73 357 B (`dist/gsap.min.js`) | 27 434 B (bundlephobia); 28 448 B (gzip-9 sendiri) | S03, S05, S07 |
| gsap/ScrollTrigger | 3.15.1 | ikut gsap | 44 683 B (`dist/ScrollTrigger.min.js`) | 17 991 B (gzip-9 sendiri) | S07 |
| lenis | 1.3.28 | MIT, 0 dependensi | 18 983 B | 5 483 B | S04, S06 |
| three | 0.187.0 | MIT | 742 263 B | 185 679 B | S08, S09 |
| @react-three/fiber | 9.8.2 | MIT, peer `react >=19 <19.4` | 182 891 B | 57 672 B | S10, S11 |
| @react-three/drei | 10.7.9 | MIT | 1 680 394 B (seluruh paket) | 521 499 B (seluruh paket; tree-shaking mengurangi) | S12 |
| @splinetool/runtime | 2.0.221 | (tidak tercantum di registry) | 36 533 616 B **unpacked** | tidak diukur | S13 |
| kit anatomy `react/live.tsx` | skill lokal | MIT | 4 359 B (belum minify) | 1 526 B | S14 |
| kit anatomy `gl.mjs` | skill lokal | MIT | 8 763 B (belum minify) | 3 025 B | S14 |

Catatan: angka spek §6.1 untuk three (696 kB / 174 kB gz) berasal dari versi 0.180.0. Angka di atas lebih baru (0.187.0, diambil ulang 2026-11-26) dan menggantikannya.

Paket motion yang ditambah untuk semua opsi: GSAP + ScrollTrigger + Lenis ≈ 27 434 + 17 991 + 5 483 = **50 908 B gzip** (≈ 49,7 kB), hanya di chunk landing desktop.

## 2. Matriks keputusan

Skor 1 (buruk) sampai 5 (baik). Total = Σ(skor × bobot) / 5, skala 0–100.

| Kriteria | Bobot | (a) SVG berlapis sekarang | (b) anatomy SVG isometrik + 1 layer WebGL | (c) three.js langsung | (d) r3f + drei | (e) Spline runtime | (f) video pra-render (webm + poster) |
|---|---|---|---|---|---|---|---|
| Kualitas visual | 25 | 2 | 4 | 5 | 5 | 4 | 4 |
| Ukuran bundle | 20 | 5 | 5 | 1 | 1 | 1 | 4 |
| CSP dan self-host | 10 | 5 | 5 | 4 | 3 | 2 | 4 |
| Fallback / no-JS | 15 | 5 | 5 | 2 | 2 | 2 | 4 |
| Mobile dan GPU lemah | 15 | 5 | 4 | 2 | 2 | 2 | 3 |
| Reduced motion | 10 | 5 | 5 | 3 | 3 | 2 | 4 |
| Kompatibilitas React 19 / Next 16 | 5 | 5 | 4 | 4 | 4 | 3 | 5 |
| **Total (0–100)** | 100 | **85** | **91** | **59** | **57** | **47** | **78** |

### Alasan skor per opsi

| Opsi | Alasan utama |
|---|---|
| (a) SVG berlapis sekarang | Ringan, server-rendered, LCP aman (audit: LCP = H1 1364 ms dev, CLS 0). Volume palsu dari ekstrusi offset 20 px; tidak ada part, tidak ada mekanisme, tidak bisa menceritakan 5 gerbang. Visual 2. |
| (b) anatomy + 1 layer WebGL | Objek nyata dengan 40–80 part, shading 4 nada, painter order yang diaudit (`--audit`), cetak A4 untuk lampiran skripsi. Geometri dihitung di server; klien hanya memuat `live.tsx` (1 526 B gz) dan, bila Tier 2 aktif, `gl.mjs` (3 025 B gz). Mobile 4, bukan 5, karena layer WebGL tetap butuh GPU (dimatikan di mobile). Kompatibilitas 4: kit menyediakan komponen React server-safe, tetapi belum pernah dipasang di repo ini. |
| (c) three.js | Visual terbaik bila dikerjakan ahli, tetapi 185 679 B gz hanya untuk inti, tanpa fallback alami (canvas kosong tanpa JS), dan butuh aset model (glTF). Kompresi Draco/KTX2 memakai decoder WASM yang menuntut `'wasm-unsafe-eval'`, yang tidak ada di CSP. |
| (d) r3f + drei | Biaya (c) ditambah 57 672 B gz r3f. Peer `react >=19 <19.4` cocok dengan react 19.2.8 sekarang, tetapi mengunci upgrade React. drei menambah loader; sumber decoder default-nya **belum terverifikasi** dalam riset ini, jadi dinilai 3 untuk CSP. |
| (e) Spline runtime | Paket 36,5 MB unpacked; scene `.splinecode` dimuat runtime. Resend memakai pola ini (lihat `riset-referensi-atm.md`), tetapi CSP `connect-src 'self'` menuntut scene di-self-host, dan perilaku reduced-motion bergantung pada scene. |
| (f) video pra-render | 0 kB JS tambahan, pola yang dipakai beberapa referensi (aset `.webm`/`.mp4`). Kelemahan: scrub video per frame lewat scroll tersendat bila keyframe jarang; byte media harus diukur; teks di dalam video tidak dapat dibaca screen reader dan tidak ikut tema terang/gelap. |

## 3. Keputusan

**Pilih (b): "Forge Line" dengan kit anatomy, satu layer WebGL opsional.** Opsi (f) jadi cadangan bila anatomy gagal lolos audit geometri di M2.

Alasan dalam satu kalimat: (b) memberi volume, mekanisme yang bercerita (perisai melewati 5 stasiun temper) dan fallback SVG penuh dengan biaya JS 3D di bawah 5 kB gz, sedangkan (c)/(d)/(e) membayar 185–243 kB gz atau WASM tanpa menambah bukti produk.

Yang ditolak untuk v1: (c), (d), (e). Boleh dinilai ulang setelah sidang bila ada kebutuhan rotasi bebas oleh pengguna.

## 4. Empat tingkat fallback

| Tingkat | Kapan dipakai | Isi | JS 3D | Syarat lulus |
|---|---|---|---|---|
| **Tier 0** (wajib) | no-JS, `prefers-reduced-motion: reduce` (sebagai pose akhir), viewport < 1024 px, `pointer: coarse` | Poster SVG isometrik statis Forge Line, pose "perisai di gerbang 5", server-rendered, `aria-hidden` | 0 B | H1 tetap elemen LCP; hero terlihat dengan JS dimatikan |
| **Tier 1** (default desktop) | ≥ 1024 px, `pointer: fine`, motion diizinkan | SVG yang sama + GSAP ScrollTrigger (pin di `#main`) + Lenis (wrapper `#main`). Perisai berjalan melewati 5 stasiun mengikuti progres scroll | 0 B library 3D; motion ≈ 50 908 B gz | 60 fps di laptop penguji; tidak ada scroll-jacking (bagian 11 PRD) |
| **Tier 2** (opsional, flag `NEXT_PUBLIC_HERO_GL=1`) | Tier 1 + WebGL2 tersedia + `deviceMemory` ≥ 4 bila terbaca | Satu kanvas shader `gl.mjs` di antara SVG belakang dan depan: bara tungku, uap pendinginan, cahaya tungku. Render hanya saat hero terlihat, DPR maksimum 1,5 | ≈ 3 025 B gz | Bila konteks WebGL gagal, kembali ke Tier 1 tanpa lompatan visual |
| **Tier 3** (ditolak v1) | - | three.js + r3f di bundle utama | ≈ 243 351 B gz (185 679 + 57 672) | Tidak dibangun |

## 5. Kecocokan kit anatomy (dinilai dari SKILL.md)

| Aspek | Ada di kit | Arti untuk ShieldForge |
|---|---|---|
| Volume (solids, `extrude` 4 tone sisi + atas) | ya | perisai, landasan, tungku punya ketebalan nyata |
| Painter's order terbukti (`A.settle`, `--audit`) | ya | tidak ada part yang "tembus" saat bergerak |
| Shading 4 nada (lo/mid/hi/lit) | ya | cocok dengan tema Dark Clay dan Light Clay; satu aksen `lit` = perisai |
| WebGL opsional (`gl.mjs`, 3 layer: SVG belakang / kanvas / SVG depan) | ya | Tier 2 tanpa three.js |
| Fallback tanpa WebGL (`drive.mjs --no-webgl`) | ya | Tier 0/1 terjamin dapat diuji |
| Cetak A4 (`print.mjs`) | ya | lampiran skripsi dari figur yang sama |
| Integrasi Next (server/client split, `references/react.md`) | ya | geometri di Server Component, gerak di satu Client Component |
| Kalibrasi ukuran | Figure 40–80 part (≤ 1 jam), Hero 80–150 part (2–4 jam) | Forge Line = **Figure** di batas atas (≈ 60–80 part) |
| Mode 3D berputar (`turn.mjs`) | beta | tidak dipakai v1 |
