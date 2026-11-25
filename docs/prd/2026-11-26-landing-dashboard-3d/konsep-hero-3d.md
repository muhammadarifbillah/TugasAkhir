# Konsep Hero 3D (putaran 2)

Tanggal 2026-11-26. Dokumen ini menggantikan bagian 3 `rekomendasi-3d.md` ("Forge Line", batal oleh spek-v2). Nama produk ditulis `{NAMA}` sampai pemilik memilih (lihat `penamaan.md`). Angka bundle diambil dari `rekomendasi-3d.md` bagian 1 (S05, S06, S07, S14). Fakta produk diambil dari kode repo HEAD d6da5f8 (S33, S36, S78–S81).

## Fakta produk yang boleh digambar

Setiap unsur visual di bawah harus menunjuk salah satu baris ini. Yang tidak ada di tabel tidak boleh muncul di hero.

| Fakta | Nilai | Sumber |
|---|---|---|
| Gerbang berurutan | 5: analysis, design, development, testing, handover | S81, S33 |
| Sub-langkah | 26 | S33 |
| Task NIST SSDF unik | 42 | S33 |
| Pemindai | Semgrep (SAST) dan Trivy, dijalankan di gerbang testing | S36 |
| Skor | 100 dikurangi bobot (critical 20, high 10, medium 4, low 1); 2 medium + 1 low = 91 | S36 |
| Temuan menyimpan alamat | `filePath`, `line`, `nistTask`, `isoControls` | S78 |
| Pemetaan per temuan | injection dan xss → PW.4.1 / A.8.28; dependency → PW.7.2 / A.8.8, A.8.29 | S79 |
| Pemetaan per gerbang | G1 PO.1.1 (A.5.1, A.5.8) … G4 PW.8.1 (A.8.29) … G5 PS.3.1 | S80 |
| Keluaran | ZIP, push ke GitHub, dokumen, CSV matriks NIST-ISO | S72, S71, S73 |
| Identitas lama | 5 warna temper 205/260/282/310/371 °C (straw, brown, purple, blue, grey) dan hallmark segi-4, lingkar, segitiga, persegi, segilima | S33, audit-landing.md bagian 7 |

## Ringkasan empat konsep

| # | Nama konsep | Yang bergerak | Arti gerak | Carrier | Skor |
|---|---|---|---|---|---|
| 1 | Pintu Sluis Lima | lima pintu geser dengan interlock; palet kode berpindah ruang | urutan dikunci: pintu berikutnya hanya terbuka setelah ruang sebelumnya lulus | (b) | 89,5 |
| 2 | **Pita Pindai** | pita diff berjalan di bawah lima kepala baca; rem menjepit; odometer skor turun | pemindai nyata membaca kode, skor dihitung dari temuan, bukan ditebak | (b) tanpa WebGL | **90,5** |
| 3 | Benang Bukti | benang ditarik dari kartu kode ke temuan ke kontrol | setiap temuan punya alamat di kode dan di standar | (a) | 82 |
| 4 | Silinder Lima Pin | pin turun ke garis potong; plug berputar; laci ekspor terbuka | ekspor dan push baru terbuka setelah lima gerbang lulus | (b) | 75,5 |

Uji "poster": pada keempat konsep, kalau gerak dihapus yang tersisa hanya deretan ruang, mesin, papan, atau gembok tanpa cerita. Maknanya ada di perubahan keadaan, jadi keempatnya lolos.

---

## Konsep 1: Pintu Sluis Lima

| # | Field | Isi |
|---|---|---|
| 1 | Nama konsep | Pintu Sluis Lima |
| 2 | Ide satu kalimat | Palet kode dari AI melewati lima ruang sluis, dan pintu berikutnya baru terbuka bila ruang sebelumnya lulus. (17 kata) |
| 3 | Mekanisme | Lima ruang berjajar di atas rel. Tiap pintu geser punya pasak interlock: pintu N+1 tidak bisa naik selama pintu N belum menutup di belakang palet dan lampu ruang N belum hijau. Scroll menggerakkan palet dan pintu. Di ruang 4 (testing) palet tertahan, lampu merah menampilkan "2 medium + 1 low", lalu terbuka setelah revisi. Tanpa gerak, gambar ini hanya lima kotak berjajar; urutan dan penahanan hilang. |
| 4 | Nilai jual | **Urutan yang dikunci server.** Audiens paling tersentuh: junior dev dan dosen penguji, yang perlu melihat bahwa tahap tidak bisa dilompati. |
| 5 | Adegan 3D | Objek utama: jalur lima ruang sluis di atas rel. Kamera azimut 40°, elevasi 30° (sisi panjang terlihat). Material: pelat logam matte, kaca lampu. Palet: tema gelap yang dipakai landing sekarang; aksen `lit` = palet kode. **Mempertahankan** 5 warna temper (lampu tiap ruang) dan hallmark (pelat di ambang atas pintu). Daftar part di bawah. |
| 6 | Alur scroll | Parameter motion mengikuti PRD bab 11; bila berbeda, PRD yang berlaku. Tabel di bawah. Pin hero di `#main` (ScrollTrigger `scroller: "#main"`, `pin: true`, `scrub: 0.6`, `end: "+=1600"`), Lenis `wrapper: #main`, `content: #main-content`. Gulir balik memutar timeline mundur: palet kembali, pintu menutup dalam urutan terbalik. |
| 7 | Fallback | Tabel di bawah. |
| 8 | Biaya dan risiko | JS: motion 50 908 B gz + `live.tsx` 1 526 B gz = 52 434 B gz (Tier 1); + `gl.mjs` 3 025 B gz bila Tier 2 = 55 459 B gz. Estimasi 4–5 hari kerja (figur anatomy kelas Figure ≈ 67 part, ditambah timeline, fallback, tes). Risiko utama: di 375 px lima ruang menjadi terlalu kecil sehingga Tier 0 harus memotong ke 3 ruang tengah; risiko kedua, interlock pintu dan palet saling menutup sehingga painter order butuh pemisahan belakang/depan per pintu. |
| 9 | Sketsa | Frame figcraft `konsep-1-pintu-sluis-1440` → `wireframe-konsep-1.png` (1440×900). |

**Daftar part (67)**

| Grup | Part | Jumlah |
|---|---|---|
| base | pelat dasar, kaki, sekrup sudut, pelat label, strip penggaris rel, rel lantai | 1 + 4 + 4 + 1 + 1 + 2 = 13 |
| structure | dinding sekat ruang, ambang atas, tiang pemandu pintu, balok atap terbuka | 6 + 5 + 10 + 1 = 22 |
| mechanism | daun pintu geser, batang penarik pintu, pegas penutup, pasak interlock | 5 + 5 + 5 + 4 = 19 |
| controls | lampu status ruang (warna temper), pelat hallmark ambang, panel indikator bukti | 5 + 5 + 1 = 11 |
| subject | palet kode (lit), roda palet | 1 + 1 (as roda ganda) = 2 |

**Alur scroll**

| Progres | Di layar | Copy |
|---|---|---|
| 0% | lima ruang tertutup, palet di depan pintu 1 | "Lima gerbang, berurutan." |
| 25% | pintu 1 dan 2 terbuka bergantian, lampu jerami dan coklat menyala | "Analisis dan desain dicatat sebelum kode ditulis." |
| 50% | gerbang 3 lulus, palet masuk ruang 4, lampu pemindai berkedip satu kali | "Semgrep dan Trivy berjalan di gerbang 4." |
| 75% | palet tertahan, lampu merah "2 medium + 1 low = 91", lalu revisi, pintu 4→5 naik | "Temuan diperbaiki dulu, baru pintu dibuka." |
| 100% | pintu 5 terbuka, palet keluar ke rak ekspor | "Lulus, dengan bukti yang bisa diunduh." |

**Fallback**

| Tier | Kapan | Isi | Yang hilang |
|---|---|---|---|
| 0 | no-JS, reduced motion, < 1024 px, `pointer: coarse` | poster SVG statis pose 75% (palet tertahan di ruang 4) | urutan gerak; penjelasan pindah ke teks di bawah poster |
| 1 | desktop ≥ 1024 px, motion diizinkan | SVG anatomy + GSAP ScrollTrigger + Lenis | tidak ada |
| 2 | flag `NEXT_PUBLIC_HERO_GL=1`, WebGL2 tersedia | satu kanvas `gl.mjs` untuk cahaya lampu ruang di lantai | tanpa Tier 2, lampu hanya warna datar |
| 3 | ditolak | three.js + r3f (≈ 243 351 B gz) | tidak dibangun |

---

## Konsep 2: Pita Pindai

| # | Field | Isi |
|---|---|---|
| 1 | Nama konsep | Pita Pindai |
| 2 | Ide satu kalimat | Kode dari AI berjalan sebagai pita di bawah lima kepala baca, dan pita berhenti tiap kali ada temuan. (18 kata) |
| 3 | Mekanisme | Pita diff tergulung dari kiri ke kanan melewati lima kepala baca berurutan. Kepala 4 mewakili Semgrep dan Trivy: saat baris rentan lewat, rem pita menjepit, baris disorot, dan drum odometer berputar dari 100 ke 96, 92, lalu 91. Setelah revisi, baris merah diganti, rem lepas, cap kontrol tercetak di margin pita. Tanpa gerak, gambar ini hanya mesin pita diam; penangkapan, penjepitan, dan penurunan skor hilang. |
| 4 | Nilai jual | **Pemindai nyata (Semgrep/Trivy)**, dengan skor deterministik sebagai keluarannya dan cap kontrol ISO/IEC 27001:2022 sebagai penutup (sumbu standar judul skripsi, S98). Audiens paling tersentuh: indie/SME dev dan security-minded dev, yang mengenali diff dan severity. |
| 5 | Adegan 3D | Objek utama: mesin pembaca pita di atas meja. Kamera azimut 35°, elevasi 32° (pita dibaca dari kiri ke kanan). Material: badan logam gelap, pita kertas krem dengan baris kode monospace (FaceText anatomy di bidang pita), drum odometer. Aksen `lit` = baris yang sedang dibaca. **Mempertahankan** 5 warna temper (tutup kepala baca) dan hallmark (pelat di muka kepala). Daftar part di bawah. |
| 6 | Alur scroll | Parameter motion mengikuti PRD bab 11; bila berbeda, PRD yang berlaku. Tabel di bawah. Pin hero di `#main` (ScrollTrigger `scroller: "#main"`, `pin: true`, `scrub: 0.6`, `end: "+=1600"`), Lenis `wrapper: #main`, `content: #main-content` (anak pertama `#main`). Adegan 0–25% dibuka dengan prompt pengguna, lalu kode hasil AI tercetak di kepala 1–3, sebelum kepala 4 memindai. Gulir balik menggulung pita mundur; odometer naik lagi; rem menjepit lagi di baris yang sama (keadaan murni fungsi progres, bukan riwayat). |
| 7 | Fallback | Tabel di bawah. |
| 8 | Biaya dan risiko | JS: 50 908 + 1 526 = 52 434 B gz. Tier 2 tidak dibutuhkan (tidak ada api, air, atau cahaya yang tidak bisa digambar garis), jadi `gl.mjs` tidak dikirim. Estimasi 5–6 hari kerja (Figure ≈ 58 part, teks di bidang pita, odometer, tabel alternatif, tes). Risiko utama: teks kode di pita tidak terbaca di 1024 px; mitigasi: maksimal 5 baris, 34 karakter per baris, ukuran ≥ 12 px setelah proyeksi, dan tabel temuan HTML di bawah panggung sebagai sumber teks sebenarnya. Risiko kedua: penonton membaca kelima kepala sebagai lima pemindai; copy wajib menyebut "kepala 4 = Semgrep + Trivy, kepala lain = gerbang lain". |
| 9 | Sketsa | Frame figcraft `konsep-2-pita-pindai-1440` → `wireframe-konsep-2.png` (1440×900). |

**Daftar part (58)**

| Grup | Part | Jumlah |
|---|---|---|
| base | meja dasar, kaki karet, sekrup sudut, pelat label, strip penggaris jalur pita | 1 + 4 + 4 + 1 + 1 = 11 |
| structure | tiang gulungan, as gulungan, jembatan kepala, braket kepala, pelindung debu | 2 + 2 + 1 + 5 + 1 = 11 |
| mechanism | gulungan suplai, gulungan penarik, rol pemandu, capstan, rol penekan, kepala baca, lensa kepala, rem pita, pegas rem, drum odometer | 1 + 1 + 4 + 1 + 1 + 5 + 5 + 1 + 1 + 3 = 23 |
| controls | kenop pengencang pita, sakelar arah, stempel cap margin, lampu baca (warna temper) | 1 + 1 + 1 + 5 = 8 |
| subject | pita diff (lit), penanda baris tertangkap, cap kontrol di margin | 1 + 3 + 1 = 5 |

**Alur scroll**

| Progres | Di layar | Copy |
|---|---|---|
| 0% | prompt pengguna masuk: kartu prompt di ujung kiri pita yang masih kosong; lima kepala gelap, odometer 100 | "Tulis prompt; AI membangun websitenya." |
| 25% | pita bergerak; kode hasil AI tercetak di pita saat melewati kepala 1–3, yang menyala berurutan (straw, brown, purple) | "AI menulis kodenya, gerbang 1–3 mencatat urutannya." |
| 50% | kepala 4 menangkap 3 baris, rem menjepit, odometer 100 → 96 → 92 → 91 | "Semgrep dan Trivy menemukan 2 medium dan 1 low. Skor 91." |
| 75% | baris merah diganti, rem lepas, cap A.8.29 · PW.8.1 tercetak di margin | "Diperbaiki, lalu dipetakan ke kontrol ISO/IEC 27001:2022 (dan NIST SSDF)." |
| 100% | kepala 5 menyala, pita tergulung, tombol "Unduh laporan" dan "Push ke GitHub" muncul | "Bawa pulang kodenya, beserta buktinya." |

**Fallback**

| Tier | Kapan | Isi | Yang hilang |
|---|---|---|---|
| 0 | no-JS, reduced motion, < 1024 px, `pointer: coarse` | poster SVG statis pose 50% (pita terjepit, odometer 91) + tabel temuan HTML | gerak pita dan hitung mundur skor; angka tetap terbaca di tabel |
| 1 | desktop ≥ 1024 px | SVG anatomy + GSAP ScrollTrigger + Lenis | tidak ada |
| 2 | tidak dipakai | (cadangan: cahaya lampu baca di pita, bila pemilik ingin) | tidak relevan |
| 3 | ditolak | three.js + r3f | tidak dibangun |

---

## Konsep 3: Benang Bukti

| # | Field | Isi |
|---|---|---|
| 1 | Nama konsep | Benang Bukti |
| 2 | Ide satu kalimat | Pilih satu temuan, dan benang merah menunjuk baris kode asalnya serta kontrol standar yang dipetakan. (15 kata) |
| 3 | Mekanisme | Papan gabus berdiri dengan tiga kolom kartu: kode (berkas:baris), temuan, kontrol (NIST/ISO). Scroll menarik benang dari paku ke paku; kartu yang terhubung terangkat sedikit. Benang hanya digambar bila field `line`, `nistTask`, dan `isoControls` terisi; paku tanpa data tetap kosong. Tanpa gerak, papan hanya tiga kolom kartu; hubungan sebab-akibatnya hilang. |
| 4 | Nilai jual | **Bukti terpetakan NIST/ISO.** Audiens paling tersentuh: security-minded dev dan dosen penguji. |
| 5 | Adegan 3D | Objek utama: papan gabus pada kaki penyangga. Kamera azimut 20°, elevasi 15° (papan hampir frontal agar teks terbaca). Material: gabus, kertas kartu, paku logam, benang. Aksen `lit` = benang terpilih. Carrier (a) SVG berlapis: kartu diberi ketebalan 2–3 px dan bayangan, tidak perlu kit anatomy. 5 warna temper **dipertahankan sebagian** (pita warna di kartu kontrol per gerbang); hallmark **tidak dipakai** di papan, hanya di legenda. |
| 6 | Alur scroll | Parameter motion mengikuti PRD bab 11; bila berbeda, PRD yang berlaku. Tabel di bawah. Pin hero di `#main` (ScrollTrigger `scroller: "#main"`, `pin: true`, `scrub: 0.6`, `end: "+=1600"`), Lenis `wrapper: #main`, `content: #main-content`. Gulir balik melepas benang dalam urutan terbalik. |
| 7 | Fallback | Tabel di bawah. |
| 8 | Biaya dan risiko | JS: 50 908 B gz (motion saja). Estimasi 3 hari kerja (≈ 47 part SVG). Risiko utama: terasa seperti diagram, bukan objek, sehingga daya tarik developer rendah; risiko kedua: di 375 px tiga kolom harus ditumpuk dan benang kehilangan arah. |
| 9 | Sketsa | Frame figcraft `konsep-3-benang-bukti-1440` → `wireframe-konsep-3.png` (1440×900). |

**Daftar part (47)**

| Grup | Part | Jumlah |
|---|---|---|
| base | papan gabus, bingkai kayu (4 sisi), kaki penyangga | 1 + 4 + 2 = 7 |
| structure | rel kolom, label kolom | 3 + 3 = 6 |
| mechanism | paku tekan, benang, gulungan benang, pemberat benang | 12 + 6 + 1 + 3 = 22 |
| controls | kartu kode, kartu temuan, kartu kontrol, klip skor | 3 + 3 + 3 + 1 = 10 |
| subject | benang terpilih (lit), sorotan kartu terpilih | 1 + 1 = 2 |

**Alur scroll**

| Progres | Di layar | Copy |
|---|---|---|
| 0% | tiga kolom kartu, paku kosong | "Setiap temuan punya alamat." |
| 25% | benang pertama: routes/user.ts:14 → SQL mentah (injection) | "Baris kode yang memicu temuan." |
| 50% | benang lanjut ke PW.4.1 · A.8.28 | "Dipetakan ke NIST SSDF dan ISO 27001." |
| 75% | dua benang lain tertarik; klip skor 91 muncul | "Tiga temuan, skor 91, rumus tetap." |
| 100% | semua benang tegang, tombol "Unduh CSV matriks" | "Unduh matriksnya, periksa sendiri." |

**Fallback**

| Tier | Kapan | Isi | Yang hilang |
|---|---|---|---|
| 0 | no-JS, reduced motion, < 1024 px | tabel HTML kode–temuan–kontrol (sekaligus poster) | benang dan gerak tarik |
| 1 | desktop | SVG berlapis + GSAP + Lenis | tidak ada |
| 2 | tidak dipakai | - | - |
| 3 | ditolak | three.js + r3f | tidak dibangun |

---

## Konsep 4: Silinder Lima Pin

| # | Field | Isi |
|---|---|---|
| 1 | Nama konsep | Silinder Lima Pin |
| 2 | Ide satu kalimat | Rilis hanya berputar bila kelima pin gerbang sejajar di garis potong. (11 kata) |
| 3 | Mekanisme | Potongan silinder kunci pin-tumbler dengan lima pin. Anak kunci (proyek) masuk; pin 1–3 turun ke garis potong satu per satu; pin 4 macet karena temuan; setelah revisi pin 4 dan 5 sejajar, plug berputar 90°, cam mendorong laci ekspor terbuka. Tanpa gerak, ini gembok diam; syarat "semua sejajar dulu" hilang. |
| 4 | Nilai jual | **Ekspor dan push**, yang baru terbuka setelah lima gerbang lulus. Audiens: indie/SME dev yang mau membawa kode keluar. |
| 5 | Adegan 3D | Objek utama: silinder kunci terpotong (cutaway) di dudukan. Kamera azimut 50°, elevasi 28°. Material: kuningan untuk plug dan pin kunci, baja untuk rumah. Aksen `lit` = anak kunci. **Mempertahankan** 5 warna temper (pin pendorong) dan hallmark (di bawah tiap pin). |
| 6 | Alur scroll | Parameter motion mengikuti PRD bab 11; bila berbeda, PRD yang berlaku. Tabel di bawah. Pin hero di `#main` (ScrollTrigger `scroller: "#main"`, `pin: true`, `scrub: 0.6`, `end: "+=1600"`), Lenis `wrapper: #main`, `content: #main-content`. Gulir balik menarik kunci keluar, pin kembali acak dalam urutan terbalik. |
| 7 | Fallback | Tabel di bawah. |
| 8 | Biaya dan risiko | JS: 52 434 B gz (Tier 1), 55 459 B gz dengan Tier 2 (kilap logam). Estimasi 6–7 hari kerja: cutaway dengan pin di dalam rumah menuntut pemisahan belakang/depan untuk setiap pin dan `A.settle` pada pegas. Risiko utama: gembok terbaca "aman terjamin", yang bertabrakan dengan larangan klaim; copy harus menyebut "lulus pemeriksaan". |
| 9 | Sketsa | Frame figcraft `konsep-4-silinder-pin-1440` → `wireframe-konsep-4.png` (1440×900). |

**Daftar part (48)**

| Grup | Part | Jumlah |
|---|---|---|
| base | blok dudukan, kaki, sekrup, pelat label | 1 + 4 + 4 + 1 = 10 |
| structure | rumah silinder, cincin tutup depan, lubang pin, pelat penahan pegas, jendela potong | 1 + 1 + 5 + 1 + 1 = 9 |
| mechanism | pin pendorong (warna temper), pin kunci, pegas, plug, cam belakang, batang laci, garis potong | 5 + 5 + 5 + 1 + 1 + 1 + 1 = 19 |
| controls | laci ekspor, gagang laci, lampu push, pelat hallmark | 1 + 1 + 1 + 5 = 8 |
| subject | anak kunci (lit), gerigi kunci dihitung sebagai satu profil | 1 + 1 = 2 |

**Alur scroll**

| Progres | Di layar | Copy |
|---|---|---|
| 0% | kunci di luar, pin acak | "Rilis terkunci." |
| 25% | kunci masuk, pin 1–3 turun ke garis potong | "Tiga gerbang pertama lulus." |
| 50% | pin 4 macet: 2 medium + 1 low, skor 91 | "Temuan menahan putaran." |
| 75% | revisi, pin 4 lalu pin 5 sejajar | "Diperbaiki, pin sejajar." |
| 100% | plug berputar, laci ZIP terbuka, lampu push menyala | "Ekspor dan push terbuka." |

**Fallback**

| Tier | Kapan | Isi | Yang hilang |
|---|---|---|---|
| 0 | no-JS, reduced motion, < 1024 px | poster pose 50% | gerak pin dan putaran plug |
| 1 | desktop | SVG anatomy + GSAP + Lenis | tidak ada |
| 2 | flag GL | kilap logam pada plug | kilap |
| 3 | ditolak | three.js + r3f | tidak dibangun |

---

## Bukti bahwa konsep berbeda

**Mekanisme** (tidak sinonim): pintu geser dengan interlock (translasi vertikal, logika berurutan), pita berjalan dengan rem (translasi horizontal kontinu + hitung mundur), benang ditarik antar paku (garis tumbuh, relasi graf), pin sejajar lalu rotasi plug (syarat konjungtif lalu rotasi).

**Daftar part**: irisan jenis part antar konsep hanya ada di grup base generik (pelat/meja dasar, kaki, sekrup, pelat label).

| Pasangan | Jenis part sama | Jenis part total (konsep lebih kecil) | Beda |
|---|---|---|---|
| 1 vs 2 | 4 (dasar, kaki, sekrup, label) | 19 (konsep 1) | 79% |
| 1 vs 4 | 4 | 19 (konsep 1) | 79% |
| 2 vs 4 | 4 | 22 (konsep 4; konsep 2 punya 27) | 82% |
| 3 vs semua | 0 | 15 (konsep 3) | 100% |

Jumlah jenis part: K1 19, K2 27, K3 15, K4 22. Jenis yang sama dihitung dari nama part di tabel daftar part masing-masing.

## Matriks skor

Skor 1–5. Poin = skor × bobot / 5. Skor performa diturunkan dari sub-skor carrier di `rekomendasi-3d.md` bagian 2 (rata-rata "ukuran bundle" dan "mobile dan GPU lemah"): (a) (5+5)/2 = 5; (b) (5+4)/2 = 4,5.

| Kriteria | Bobot | K1 Pintu Sluis | K2 Pita Pindai | K3 Benang Bukti | K4 Silinder Pin |
|---|---|---|---|---|---|
| Daya tarik developer | 25 | 4 → 20 | 5 → 25 | 3 → 15 | 4 → 20 |
| Kejelasan pesan | 20 | 5 → 20 | 4 → 16 | 3 → 12 | 4 → 16 |
| Kejujuran / bisa dibuktikan | 20 | 5 → 20 | 5 → 20 | 5 → 20 | 3 → 12 |
| Performa | 15 | 4,5 → 13,5 | 4,5 → 13,5 | 5 → 15 | 4,5 → 13,5 |
| Aksesibilitas | 10 | 4 → 8 | 5 → 10 | 5 → 10 | 4 → 8 |
| Kemudahan implementasi | 10 | 4 → 8 | 3 → 6 | 5 → 10 | 3 → 6 |
| **Total** | **100** | **89,5** | **90,5** | **82** | **75,5** |

Alasan skor yang paling menentukan:

- K2 mendapat daya tarik 5 karena diff, severity, dan skor adalah benda yang developer lihat setiap hari; K1 mendapat kejelasan 5 karena "pintu terkunci" dipahami tanpa membaca lede.
- K4 kejujuran 3: metafora gembok mendorong pembaca ke "aman terjamin", padahal produk hanya menyatakan lulus pemeriksaan.
- K3 daya tarik 3: papan bukti mudah terbaca sebagai diagram rapat, bukan alat.
- Aksesibilitas K2 dan K3 bernilai 5 karena isi hero (tabel temuan / tabel pemetaan) sudah berupa teks HTML; K1 dan K4 menyimpan makna di warna lampu dan posisi pin, sehingga butuh teks pengganti tambahan.

## Pemetaan konsep ke carrier

| Konsep | Carrier | Skor carrier (rekomendasi-3d.md) | Penilaian ulang |
|---|---|---|---|
| K1 Pintu Sluis | (b) anatomy SVG + 1 layer WebGL | 91 | tidak perlu |
| K2 Pita Pindai | (b') anatomy SVG **tanpa** layer WebGL | (b) = 91 | dihitung ulang: mobile dan GPU lemah naik 4 → 5 karena tidak ada kanvas. (4×25 + 5×20 + 5×10 + 5×15 + 5×15 + 5×10 + 4×5) / 5 = **94** |
| K3 Benang Bukti | (a) SVG berlapis | 85 | tidak perlu |
| K4 Silinder Pin | (b) anatomy SVG + 1 layer WebGL | 91 | tidak perlu |

Carrier (c), (d), (e) tidak dituntut oleh konsep mana pun. Carrier (f) video tetap cadangan bila figur anatomy gagal audit geometri di M2.

## Rekomendasi: Konsep 2, Pita Pindai

Alasan:

1. Skor tertinggi (90,5), dengan carrier yang dinilai ulang paling ringan di antara opsi anatomy (94, 52 434 B gz, tanpa kanvas).
2. Setiap unsur yang bergerak punya padanan di kode: kepala 4 = `semgrep/semgrep` dan `aquasec/trivy` (S36), odometer = `score.ts` (S36), cap margin = `GATE_MAPPING` G4 (S80).
3. Angka 91 dihitung di depan mata pembaca (100 − 4 − 4 − 1), sehingga klaim "skor deterministik" terbukti tanpa kalimat tambahan.
4. Diff dan severity adalah bahasa yang sudah dipakai developer; hero terasa seperti alat, bukan poster.
5. Identitas lama tetap hidup: lima warna temper di tutup kepala dan lima hallmark di muka kepala, jadi kupon gerbang, rail, dan dashboard tidak perlu digambar ulang.

**Kapan rekomendasi ini salah:** bila uji baca di 1024 px menunjukkan baris kode pada pita tidak terbaca, atau bila pembimbing menilai pesan utama skripsi adalah "urutan dikunci server", maka Konsep 1 (selisih 1 poin) harus dipilih.

## Konsekuensi identitas

| Unsur | Status di Konsep 2 | Catatan |
|---|---|---|
| 5 warna temper 205/260/282/310/371 °C | dipertahankan | tutup kepala baca dan lampu baca |
| Hallmark segi-4/lingkar/segitiga/persegi/segilima | dipertahankan | pelat muka kepala baca |
| Metafora tempa (tungku, perisai, "AMANKAN") | **dibuang** | diganti metafora pembacaan: kode lewat, dibaca, ditahan, diperbaiki |
| Perisai hero `hero-shield.tsx` | dibuang dari hero | boleh tetap sebagai ikon kecil di header sampai nama baru dipilih |

Membuang metafora tempa adalah **keputusan pemilik** (blok "Keputusan yang menunggu pemilik" di PRD). Bila pemilik menolak, Konsep 1 juga mempertahankan temper dan hallmark, dan tidak satu pun konsep memakai tungku.

## Yang tetap dipakai dari landing sekarang

Elemen berikut tidak ikut berubah, apa pun konsep yang dipilih:

1. Angka dari `landing-facts.ts`: 5 gerbang, 42 task NIST, 26 sub-langkah, 6 provider, 2 bahasa (S33), termasuk tes yang mematoknya.
2. Pengungkap 26 sub-langkah (`substeps-disclosure.tsx`).
3. Tabel bukti dan sitasi Veracode di `problem-section.tsx` dan `proof-section.tsx` (S19).
4. Unduhan CSV matriks NIST-ISO (nama berkas diatur di `penamaan.md` fase 4).
5. Glosarium dan FAQ (`glossary.tsx`, `faq.tsx`).
6. Vignette skor 91 di `#cara-kerja` yang memakai fungsi skor asli.

## Catatan pemakaian kit anatomy

Kit dibaca dari `C:\Users\Arif\.config\opencode\skills\anatomy\SKILL.md`. Dampaknya pada konsep:

- Ukuran: K1, K2, K4 masuk kelas **Figure** (40–80 part, ≤ 1 jam untuk figur saja). Tidak ada yang naik ke Hero (80–150 part, 2–4 jam).
- Painter order untuk K2: urutan belakang ke depan = meja → tiang gulungan belakang → pita (bagian bawah kepala) → kepala baca → pelindung debu → gulungan depan → odometer. Pita dipecah menjadi segmen di antara kepala agar rem dan rol penekan bisa digambar di depannya; `A.settle` dipakai karena pita melilit gulungan.
- Teks di pita memakai `FaceText` pada bidang pita, dipotong (clip) ke jendela pita sesuai aturan "things on faces fit them".
- Satu layer WebGL **tidak layak** untuk K2: kit menyarankan shader hanya untuk api, air, dan cahaya lampu. Pita dan kepala bisa digambar penuh dengan garis. Untuk K1 dan K4 satu layer (cahaya lampu, kilap logam) layak tetapi opsional.
