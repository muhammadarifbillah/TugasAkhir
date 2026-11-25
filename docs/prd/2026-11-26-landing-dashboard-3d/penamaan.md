# Penamaan Produk (putaran 3)

Tanggal pemeriksaan: 2026-11-26. Semua status di dokumen ini menunjuk entri `sumber.json` (S39–S68 untuk kandidat, S69–S77 untuk migrasi). Nama lama hanya muncul di bagian migrasi.

> **Disclaimer.** Pemeriksaan di bawah bukan pemeriksaan merek dagang dan bukan jaminan bebas sengketa hukum. Yang diperiksa hanya tiga hal: hasil teratas pencarian web, registry npm, dan GitHub, pada tanggal 2026-11-26. Nama bisa sudah terdaftar atau dipakai di kelas barang/jasa yang tidak tercakup pencarian ini, di negara lain, atau sebagai merek yang belum punya situs. Untuk pemakaian komersial, periksa Pangkalan Data Kekayaan Intelektual DJKI (Direktorat Jenderal Kekayaan Intelektual) atau gunakan konsultan merek terdaftar. Domain **tidak dicek** untuk satu pun kandidat.

## Metode

| Pemeriksaan | Cara yang dijalankan | Catatan |
|---|---|---|
| Web | Bing RSS (`https://www.bing.com/search?format=rss&adlt=strict&cc=US&q=...`) dengan kata kunci `"<Nama>" software` dan `"<Nama>" security`; 4 hasil teratas dibaca | alat WebSearch bawaan gagal (HTTP 402), jadi dipakai RSS Bing. Hasil Bing untuk kata Indonesia banyak berisi spam; spam tidak dicantumkan namanya dan dicatat sebagai "tidak relevan" |
| npm | `GET https://registry.npmjs.org/<nama>` | 200 = nama sudah dipakai, 404 = kosong |
| GitHub | `GET https://github.com/<nama>`, `GET https://api.github.com/users/<nama>`, `GET https://api.github.com/search/repositories?q=<nama>+in:name` | status akun (User/Organization), jumlah repo bernama serupa |
| Domain | tidak dicek | dilarang mengarang status atau harga |

Syarat gugur yang diterapkan: kata generik (secure, gate, code, shield, guard, forge, dev, app) sebagai satu-satunya pembeda; sama dengan produk keamanan yang dikenal; lebih dari 3 suku kata. Kesepuluh kandidat lolos syarat ini; tabrakan yang ditemukan dicatat dan menurunkan skor.

Skala skor 1–5 (5 = terbaik) pada enam kriteria: makna, daya tarik dev, ucap ID, ucap EN, pendek, tidak generik. Total maksimum 30.

## Ringkasan

| # | Nama | Huruf | Suku kata | npm | GitHub `/<nama>` | Tabrakan web | Total |
|---|---|---|---|---|---|---|---|
| 1 | Sahih | 5 | 2 | 404 | user ada | tidak relevan | 23 |
| 2 | Sidik | 5 | 2 | 404 | user ada | **SIDIK (KLHK), SIDIK Kab. Cirebon** | 23 |
| 3 | Segel | 5 | 2 | **200** | user ada | Jason Segel (aktor) | 22 |
| 4 | Lolos | 5 | 2 | 404 | user ada | tidak relevan | 22 |
| 5 | Tilik | 5 | 2 | 404 | organisasi ada | tidak relevan | 25 |
| 6 | **Saksi** | 5 | 2 | 404 | user ada (0 repo) | tidak relevan | **27** |
| 7 | Attesta | 7 | 3 | 404 | user ada | tidak relevan; istilah dekat "attestation" padat | 22 |
| 8 | Telaah | 6 | 3 | 404 | user ada | tidak relevan | 20 |
| 9 | Sahkan | 6 | 2 | 404 | user ada | tidak relevan | 22 |
| 10 | Tapis | 5 | 2 | 404 | user ada | **GitHub: tapis-project (TACC APIs)** | 24 |

### Bukti tambahan putaran 3 (tiga kandidat teratas)

Dicek 2026-11-26 lewat `fetch`; respons mentah di `_alat/cek-nama-v3.json`. Angka di kolom pertama sampai kelima adalah status HTTP nyata.

| Nama | npm | GitHub akun | GitHub repo (jumlah, 3 teratas) | PyPI | crates.io | App Store (ID) | Play Store (ID) | Domain | Sumber |
|---|---|---|---|---|---|---|---|---|---|
| Saksi | 404 | 200, User (0 repo) | 246: yousskh5/saksi, mustafaparabakan-maker/saksi, AndhikaaW/Saksi | 404 | 404 | "Saksi — Plant Watering" (Lifestyle) | "Saksi" (Techno Craft Studio), "Saksi Partai Perindo" | tidak dicek | S109–S115 |
| Tilik | 404 | 200, Organization (0 repo) | 98: nggalek-co/tilik, YantUgli/tilik, maziazi/Tilik | 404 | 404 | tidak ada nama yang memuat "tilik" | "Tilik Kasir", "Tilik: Pengingat Tagihan" | tidak dicek | S116–S122 |
| Tapis | 404 | 200, User (2 repo) | 532: tapis-project/tapis-ui, grumets/TAPIS, tapis-project/tapis-java | **200** (paket `tapis` 0.0.2, geometri simpul) | 404 | "Top Tapis - Lavage de tapis" (cuci karpet) | tidak ada hasil relevan | tidak dicek | S123–S129 |

Skor tidak berubah (Saksi 27, Tilik 25, Tapis 24). Alasannya: aplikasi bernama Saksi dan Tilik di toko aplikasi ada di kategori lain (pemilu, perawatan tanaman, kasir, tagihan), bukan software dev atau security; risiko kata umum ini sudah dihitung di kriteria "tidak generik" v2. Paket PyPI `tapis` adalah tabrakan nyata kedua untuk Tapis setelah `tapis-project` di GitHub. Kriteria "tidak generik" Tapis sudah bernilai 2 karena tabrakan GitHub, jadi temuan PyPI dicatat sebagai alasan tambahan untuk tidak memilih Tapis, bukan penurunan skor.

Penggantian alat: pencarian `"<nama>" site:play.google.com` dan `site:apps.apple.com` lewat alat WebSearch gagal (`Web search request failed (HTTP 402)`); lewat Bing RSS hasilnya tidak relevan (operator `site:` tidak dihormati). Karena itu App Store dicek lewat iTunes Search API (`itunes.apple.com/search`, negara ID) dan Play Store lewat halaman pencarian `play.google.com/store/search` (gl=ID), lalu halaman detail aplikasi yang namanya memuat kandidat. `api.github.com` tidak kena batas laju (sisa kuota 4–6 saat dicek).

### Keterbatasan pemeriksaan

1. Ini **bukan pemeriksaan merek dagang**. Pangkalan Data Kekayaan Intelektual DJKI dan basis data merek negara lain tidak diperiksa.
2. Tidak mencakup kelas barang/jasa lain di luar yang terlihat di registry paket, GitHub, dan toko aplikasi.
3. Tidak mencakup nama perusahaan atau produk yang tidak muncul di mesin pencari, registry, atau toko aplikasi yang dicek.
4. Hasil pencarian dan toko aplikasi bergantung pada negara (ID), tanggal (2026-11-26), dan urutan algoritme; hasilnya bisa berubah.
5. Domain tidak dicek untuk satu pun kandidat.
6. Pemeriksaan tambahan putaran 3 hanya untuk tiga kandidat teratas; tujuh kandidat lain tetap pada pemeriksaan v2 (web, npm, GitHub).

## Kandidat

### 1. Sahih

| Field | Isi |
|---|---|
| Nama | Sahih |
| Tagline ID | Kode AI baru dipakai setelah terbukti sahih. |
| Tagline EN | AI code, verified before it ships. |
| Makna | "sahih" = sah, benar, dapat dipercaya. Cocok dengan gagasan kode yang dinyatakan benar setelah bukti ada. |
| Ucapan | ID: SA-hih. EN: "sa-HEE", cukup dekat. |
| Skor | makna 4, dev 3, ucap ID 5, ucap EN 3, pendek 5, tidak generik 3 = **23** |
| Bukti tabrakan | Web (S39): tidak ada produk relevan. npm (S40): HTTP 404. GitHub (S41): user `sahih` ada; 338 repo bernama serupa, teratas `essaji/Complete-Sahih-Bukhari-Json`. |
| Catatan | Kata ini lazim dipakai dalam klasifikasi hadis; memakainya untuk produk komersial berisiko dianggap tidak pantas oleh sebagian pengguna. |

### 2. Sidik

| Field | Isi |
|---|---|
| Nama | Sidik |
| Tagline ID | Setiap baris kode AI disidik sebelum rilis. |
| Tagline EN | Every AI-written line, investigated first. |
| Makna | "menyidik" = memeriksa untuk mencari bukti. |
| Ucapan | ID: SI-dik. EN: "SEE-dik", sama. |
| Skor | makna 4, dev 3, ucap ID 5, ucap EN 4, pendek 5, tidak generik 2 = **23** |
| Bukti tabrakan | Web (S42): **ada tabrakan**, "SIDIK - Sistem Informasi Data Indeks Kerentanan" (sidik.kemenlh.go.id) dan "Sistem Informasi Pendidik (SIDIK) Kab. Cirebon". npm (S43): HTTP 404. GitHub (S44): user `sidik` ada; 911 repo bernama serupa. |
| Catatan | Konotasi penyidikan polisi; dua sistem pemerintah memakai nama yang sama. |

### 3. Segel

| Field | Isi |
|---|---|
| Nama | Segel |
| Tagline ID | Kode AI disegel setelah lulus lima gerbang. |
| Tagline EN | Five gates, then the seal. |
| Makna | segel = tanda bahwa isi belum diubah sejak diperiksa. |
| Ucapan | ID: SE-gel. EN: "SEE-gul", berbeda dan mudah tertukar dengan nama aktor. |
| Skor | makna 4, dev 3, ucap ID 5, ucap EN 3, pendek 5, tidak generik 2 = **22** |
| Bukti tabrakan | Web (S45): hasil teratas didominasi Jason Segel (Wikipedia, IMDb). npm (S46): **HTTP 200**, paket sudah ada. GitHub (S47): user `segel` ada; 323 repo, teratas `mikaeljorhult/segel` (komponen Vue). |

### 4. Lolos

| Field | Isi |
|---|---|
| Nama | Lolos |
| Tagline ID | Kode AI hanya lolos bila buktinya lengkap. |
| Tagline EN | Ship only what passes. |
| Makna | lolos = lulus pemeriksaan. Langsung, tetapi pasif. |
| Ucapan | ID: LO-los. EN: "LOW-los", dekat. |
| Skor | makna 3, dev 3, ucap ID 5, ucap EN 3, pendek 5, tidak generik 3 = **22** |
| Bukti tabrakan | Web (S48): tidak ada hasil relevan. npm (S49): HTTP 404. GitHub (S50): user `lolos` ada (nama "Bill Lolos"); 307 repo. |
| Catatan | Juga berarti "lepas/kabur", ambigu untuk produk pemeriksa. |

### 5. Tilik

| Field | Isi |
|---|---|
| Nama | Tilik |
| Tagline v2 ID | Tilik kode AI, gerbang demi gerbang. |
| Tagline v2 EN | Inspect AI code, gate by gate. |
| Tagline v3 (selaras judul) ID | Platform website berbasis AI yang menilik tiap gerbang, dipetakan ke ISO/IEC 27001:2022. (K1 + K2 + K3) |
| Tagline v3 (selaras judul) EN | An AI website platform, every gate inspected and mapped to ISO/IEC 27001:2022. (K1 + K2 + K3) |
| Makna | menilik = memeriksa dengan teliti. |
| Ucapan | ID: TI-lik. EN: "TEE-lik", sama. |
| Skor | makna 4, dev 4, ucap ID 5, ucap EN 4, pendek 5, tidak generik 3 = **25** |
| Bukti tabrakan | Web (S51): tidak ada produk relevan. npm (S52): HTTP 404. GitHub (S53): `tilik` sudah dipakai sebagai **Organization** (0 repo publik); 98 repo bernama serupa. |

### 6. Saksi

| Field | Isi |
|---|---|
| Nama | Saksi |
| Tagline v2 ID | Kode AI lolos hanya bila ada saksinya. |
| Tagline v2 EN | AI code ships with a witness. |
| Tagline v3 (selaras judul) ID | Platform website berbasis AI dengan saksi ISO/IEC 27001:2022. (K1 + K2 + K3) |
| Tagline v3 (selaras judul) EN | An AI website platform with an ISO/IEC 27001:2022 witness. (K1 + K2 + K3) |
| Makna | saksi = pihak yang mencatat apa yang terjadi. Produk tidak menjanjikan kode aman; ia mencatat dan menunjukkan bukti tiap gerbang (temuan, skor, pemetaan). Makna ini paling dekat dengan nilai jual "bukti yang bisa diperiksa" dan tidak mendorong klaim sertifikasi. Selaras dengan judul skripsi (S98): produk mencatat bukti penerapan *secure development controls* ISO/IEC 27001:2022. |
| Ucapan | ID: SAK-si. EN: "SAHK-see"; sebagian penutur Inggris mungkin membaca "SACK-see", masih bisa dikenali. |
| Skor | makna 5, dev 4, ucap ID 5, ucap EN 4, pendek 5, tidak generik 4 = **27** |
| Bukti tabrakan | Web (S54): tidak ada produk software/security relevan di 4 hasil teratas; "security" 0 hasil. npm (S55): HTTP 404. GitHub (S56): user `saksi` ada (0 repo, dibuat 2013); 246 repo bernama serupa, termasuk `AndhikaaW/Saksi` (aplikasi pengaduan). |

### 7. Attesta

| Field | Isi |
|---|---|
| Nama | Attesta |
| Tagline ID | Setiap rilis membawa atestasi buktinya. |
| Tagline EN | Every release carries its attestation. |
| Makna | dari "attestation", istilah supply-chain security untuk pernyataan bertanda tentang artefak. |
| Ucapan | ID: a-TES-ta. EN: "uh-TES-tuh", sama. |
| Skor | makna 5, dev 4, ucap ID 3, ucap EN 4, pendek 3, tidak generik 3 = **22** |
| Bukti tabrakan | Web (S57): tidak ada hasil relevan. npm (S58): HTTP 404. GitHub (S59): user `attesta` ada; 4 878 repo cocok (substring "attestation"), termasuk `in-toto/attestation`. |
| Catatan | Produk belum membuat atestasi bertanda (in-toto/SLSA); nama ini menjanjikan fitur yang tidak ada. |

### 8. Telaah

| Field | Isi |
|---|---|
| Nama | Telaah |
| Tagline ID | Telaah kode AI sebelum dipercaya. |
| Tagline EN | Review AI code before trusting it. |
| Makna | menelaah = mengkaji dengan teliti. |
| Ucapan | ID: te-LA-ah. EN: sulit; "aa" ganda dibaca berbeda. |
| Skor | makna 4, dev 3, ucap ID 4, ucap EN 2, pendek 4, tidak generik 3 = **20** |
| Bukti tabrakan | Web (S60): tidak ada hasil relevan. npm (S61): HTTP 404. GitHub (S62): user `telaah` ada; 45 repo, termasuk `hiiamanop/Telaah` ("alat bantu menyelesaikan skripsi"). |

### 9. Sahkan

| Field | Isi |
|---|---|
| Nama | Sahkan |
| Tagline ID | Rilis disahkan setelah lima gerbang lulus. |
| Tagline EN | Releases approved by evidence. |
| Makna | mengesahkan = menyetujui secara resmi. |
| Ucapan | ID: SAH-kan. EN: "SAH-kan", sama. |
| Skor | makna 4, dev 3, ucap ID 5, ucap EN 3, pendek 4, tidak generik 3 = **22** |
| Bukti tabrakan | Web (S63): tidak ada hasil relevan. npm (S64): HTTP 404. GitHub (S65): user `sahkan` ada; 14 repo bernama serupa. |
| Catatan | Mendekati klaim sertifikasi yang dilarang; bentuk kata kerja perintah terasa janggal sebagai merek. |

### 10. Tapis

| Field | Isi |
|---|---|
| Nama | Tapis |
| Tagline v2 ID | Kode AI ditapis lima kali. |
| Tagline v2 EN | AI code, filtered five times. |
| Tagline v3 (selaras judul) ID | Kode AI ditapis lima gerbang yang dipetakan ke ISO/IEC 27001:2022. (K1 + K3) |
| Tagline v3 (selaras judul) EN | AI code, filtered by five gates mapped to ISO/IEC 27001:2022. (K1 + K3) |
| Makna | menapis = menyaring. |
| Ucapan | ID: TA-pis. EN: "TAP-is", sama. |
| Skor | makna 4, dev 4, ucap ID 5, ucap EN 4, pendek 5, tidak generik 2 = **24** |
| Bukti tabrakan | Web (S66): tidak ada hasil relevan. npm (S67): HTTP 404. GitHub (S68): **ada tabrakan software**, organisasi `tapis-project` (tapis-ui, tapis-java "Texas Advanced Computing Center APIs"); user `tapis` ada. |

## Rekomendasi: Saksi

Rekomendasi ini diserahkan ke pemilik lewat blok keputusan di PRD; tukang tidak memilihnya sebagai nama final.

Tagline yang diusulkan untuk landing: **tagline v3 (selaras judul)**, ID "Platform website berbasis AI dengan saksi ISO/IEC 27001:2022.", EN "An AI website platform with an ISO/IEC 27001:2022 witness." Tagline v2 ("Kode AI lolos hanya bila ada saksinya.") tetap tersedia sebagai varian pendek; keduanya tidak menggantikan H1 PRD bab 7.

Alasan:

1. Skor tertinggi (27/30) tanpa satu kriteria pun di bawah 4.
2. Maknanya jujur terhadap produk: saksi mencatat, tidak menjamin. Ini sejalan dengan larangan klaim sertifikasi dan kepatuhan (spek-v2 §14) dan dengan isi produk (temuan, skor, pemetaan tersimpan).
3. Paket npm `saksi` kosong (HTTP 404, S55), jadi CLI atau SDK di masa depan bisa memakai nama yang sama.
4. Tidak ada produk software atau security bernama Saksi di hasil teratas pencarian (S54).
5. Pendek, dua suku kata, dibaca sama oleh penutur Indonesia, cukup dekat oleh penutur Inggris; cocok dengan konsep hero Pita Pindai (pita dibaca, dicatat, disaksikan).

**Risiko terbesar:** kata "saksi" sangat umum dalam bahasa Indonesia dan dipakai di konteks pemilu dan hukum; aplikasi lain bernama Saksi sudah ada di GitHub (`AndhikaaW/Saksi`, S56), dan akun `github.com/saksi` sudah diambil, sehingga organisasi harus memakai varian (misal `saksi-dev`, belum dicek).

**Yang harus dicek pemilik sebelum dipakai:**

1. Pangkalan data merek DJKI untuk "Saksi" di kelas 9 dan 42 (perangkat lunak dan jasa TI).
2. Domain yang diinginkan (belum dicek sama sekali).
3. Nama organisasi GitHub alternatif.
4. Bab, lampiran, dan instrumen skripsi yang sudah menyebut nama lama. Judul resmi tidak memuat nama produk (S98), jadi judul tidak terdampak.

## Rencana migrasi

Rencana ini tidak dieksekusi di putaran ini. Angka diukur dengan `git grep` di HEAD d6da5f8: **39 file** terlacak memuat string nama lama, **138 kemunculan** (S69).

Rename tidak menyentuh judul skripsi. Judul resmi tidak memuat nama produk (S98), sehingga mengganti nama tidak mengubah judul; yang terdampak hanya dokumen, instrumen, dan tangkapan layar yang menyebut nama produk.

### Inventaris kategori

| Kategori | Isi | Sifat |
|---|---|---|
| A. Nama tampil UI | `src/dictionaries/id.json` dan `en.json` (kunci `app.name`, `aboutTitle`, `aboutLede`, `heroLede`, `archPlatformTitle`, `guardTitle`, `registerSubtitle`, `badgeHint`, `previewShots[].alt`, FAQ `q`/`a`) | terlihat pengguna |
| B. Metadata dan aset | `src/app/manifest.ts`, metadata Next, OG image, README, DEPLOY.md | terlihat publik |
| C. Paket dan wadah | `package.json` name, `package-lock.json`, volume Docker, Caddyfile, komentar `.env.example` | teknis, sebagian berisiko data |
| D. Keluaran produk | nama CSV, nama ZIP, default nama repo, badge, commit message, header dokumen | sudah tersebar ke pengguna |
| E. Dokumen akademik | proposal/judul skripsi, `instrumen-wawancara.md`, `instrumen-pengumpulan-data.md`, `teknologi-shieldforge.md` dan nama berkasnya | paling berisiko |
| F. Repo dan jejak eksternal | github.com/muhammadarifbillah/TugasAkhir, riwayat commit, tautan yang sudah dibagikan | tidak bisa ditarik balik |

### Enam landmine

| # | Lokasi | Tindakan | Sumber |
|---|---|---|---|
| 1 | `docker-compose.yml:9,40` volume `shieldforge-db` | **Tidak di-rename.** Mengganti nama volume membuat Postgres lama yatim dan data akun/proyek tampak hilang. Nama volume tidak terlihat pengguna, jadi dibiarkan dengan komentar "nama warisan, jangan diganti tanpa migrasi data". Bila tetap ingin diganti: `docker compose down`, salin data dengan kontainer sementara (`docker run --rm -v shieldforge-db:/from -v <baru>-db:/to alpine cp -a /from/. /to/`), ubah compose, `up`, verifikasi login, baru hapus volume lama. | S70 |
| 2 | `proof-section.tsx:44` CSV `shieldforge-matriks-nist-iso.csv` | Nama baru `{nama}-matriks-nist-iso.csv`; nama lama disebut di FAQ selama satu siklus (sampai sidang) agar penguji yang menyimpan berkas lama tahu keduanya sama isinya. | S71 |
| 3 | `deliverables-panel.tsx:103` default repo `shieldforge-website`, `:206` ZIP `shieldforge-<id>.zip`, `:89` badge | Default baru hanya berlaku untuk proyek baru. Repo yang sudah dibuat pengguna tidak disentuh. Badge lama di README pengguna tetap menampilkan nama lama; dicatat di changelog. | S72 |
| 4 | `src/lib/docs.ts:82` "Generated by ...", `:323` "name: ... Security Pipeline" (juga :111, :197, :316, :357) | Dokumen yang sudah dicetak untuk lampiran skripsi diregenerasi satu kali setelah fase 4, tanggal regenerasi dicatat di lampiran. Workflow CI pengguna yang sudah ter-push tidak berubah. | S73 |
| 5 | `src/app/manifest.ts:5-6` `name`, `short_name` | Diganti di fase 2. Perangkat yang sudah memasang PWA bisa menampilkan nama lama sampai manifest diambil ulang; catat di uji manual. | S74 |
| 6 | `src/auth.ts:11` `dev@shieldforge.local` | Diganti ke `dev@{nama}.local` bersamaan dengan reset database dev (`prisma migrate reset` di lingkungan dev saja). Sesi dev lama tidak lagi cocok; tidak berdampak ke pengguna. | S75 |

Tambahan berdampak: commit message produk (`api/github/push/route.ts:95`, `api/revisions/route.ts:147`) dan deskripsi repo (`github-push.ts:32`) menulis nama ke riwayat repo pengguna; commit lama tetap memuat nama lama (S76). `scripts/generate-docs.ts:209` dan `package.json:25` memakai nama di nama berkas keluaran (S77). Tidak ada kunci localStorage, sessionStorage, atau cookie yang memuat nama (pemeriksaan mandor, spek-v2 §7.1).

### Enam fase

| Fase | Isi | Bukti selesai |
|---|---|---|
| 0. Keputusan | pemilik memilih nama; judul resmi tidak memuat nama produk (S98), jadi yang dicek adalah bab, lampiran, dan instrumen yang sudah disetujui; cek DJKI | persetujuan tertulis pemilik; pembimbing diberi tahu bila bab/instrumen yang sudah disetujui ikut berubah |
| 1. UI dan kamus | kategori A: `id.json` dan `en.json`, jumlah kunci harus identik; `npm run check:dictionaries` di worktree/CI | kunci sama, tes lulus, `git grep -i` nama lama di `src/dictionaries` = 0 |
| 2. Metadata dan aset | kategori B: manifest (landmine 5), metadata Next, OG image, README, DEPLOY | screenshot header + manifest terbaca di DevTools |
| 3. Paket dan wadah | kategori C: `package.json` name, komentar `.env.example`, Caddyfile. **Volume Docker tidak di-rename** (landmine 1) | catatan keputusan volume di DEPLOY.md |
| 4. Keluaran produk | kategori D: CSV (landmine 2), ZIP dan default repo (landmine 3), commit message, header dokumen (landmine 4), email seed (landmine 6) | tabel kompatibilitas di bawah terisi |
| 5. Dokumen akademik | kategori E: instrumen, `teknologi-<nama>.md` dan nama berkasnya, `package.json` script `docs:tech` | daftar berkas berubah + tanggal regenerasi lampiran |
| 6. Repo dan jejak | kategori F: nama repo GitHub (redirect otomatis GitHub untuk rename repo perlu dicek ulang saat itu), tautan di proposal | daftar tautan lama dan penggantinya |

### Tabel kompatibilitas (diisi di fase 4)

| Keluaran | Nama lama | Nama baru | Nama lama dipertahankan sampai |
|---|---|---|---|
| CSV matriks | `shieldforge-matriks-nist-iso.csv` | `{nama}-matriks-nist-iso.csv` | disebut di FAQ sampai sidang |
| ZIP ekspor | `shieldforge-<id>.zip` | `{nama}-<id>.zip` | tidak dipertahankan (unduhan baru) |
| Default repo | `shieldforge-website` | `{nama}-website` | repo lama tidak disentuh |
| Commit message | `via ShieldForge` | `via {NAMA}` | commit lama permanen |
| Header dokumen | `Generated by ShieldForge AI` | `Generated by {NAMA}` | lampiran diregenerasi satu kali |
| Volume Docker | `shieldforge-db` | (tetap) | permanen |

### Risiko migrasi

| # | Risiko | Akibat | Mitigasi |
|---|---|---|---|
| 1 | Bab, lampiran, atau instrumen yang sudah disetujui memuat nama lama (judul tidak, S98) | dokumen akademik tidak konsisten | daftar berkas di fase 5; bila pembimbing tidak mengizinkan revisi, nama baru dipakai di produk dengan catatan "sebelumnya ..." di bab implementasi |
| 2 | Volume Docker ikut di-rename | data akun dan proyek tampak hilang | volume tidak di-rename (landmine 1) |
| 3 | Kunci kamus id/en tidak sinkron | teks kosong di salah satu bahasa | `check:dictionaries` sebagai gate fase 1 |
| 4 | Nama baru bertabrakan merek setelah dipakai | rename kedua | cek DJKI di fase 0, sebelum satu baris kode berubah |
| 5 | Lampiran skripsi memakai dokumen lama | angka dan nama berbeda di lampiran | regenerasi satu kali dengan tanggal tercatat |
| 6 | Tautan lama (README, proposal) rusak setelah rename repo | pembaca menemui 404 | daftar tautan lama di fase 6; cek redirect GitHub saat itu |
| 7 | Rename setengah jalan | campuran nama di UI | fase 1–4 dalam satu cabang; `git grep -i` nama lama di `src/` = 0 sebagai syarat merge (kecuali volume dan komentar warisan) |

### Pertanyaan terbuka

Pertanyaan "bolehkah judul skripsi berubah" ditutup di putaran 3: `konteks-pemilik.md` (S98) menyatakan judul resmi tidak memuat nama produk, jadi judul tidak berubah karena rename.

Yang masih terbuka:

1. **Apakah nama produk perlu muncul di judul bab** (misalnya bab implementasi), bukan di judul skripsi? Usulan default: tidak; nama produk cukup di isi bab dan lampiran, sehingga rename berikutnya tidak menyentuh daftar isi.
2. **Apakah bab, lampiran, dan instrumen yang sudah disetujui boleh direvisi namanya**, atau nama lama dipertahankan di dokumen itu dengan catatan "sebelumnya ...". Jawaban ini menentukan lingkup fase 5.


## Catatan wording tagline (peninjau U3)

Tagline "dengan saksi ISO/IEC 27001:2022" bisa terbaca seolah ISO mengesahkan produk. Tagline yang dipakai di UI:

- ID: "Kode AI lolos hanya bila ada saksinya. Setiap gerbang dipetakan ke ISO/IEC 27001:2022."
- EN: "AI code ships only with a witness. Every gate is mapped to ISO/IEC 27001:2022."

"Saksi" merujuk pada bukti yang dicatat produk (temuan, skor, pemetaan), bukan pada pihak ISO.
