# Verifikasi Runtime ShieldForge

Sesi uji 2026-11-24 di Windows, Docker Desktop (server 29.6.2), `next dev` di http://localhost:3000, commit `e843abb`. Panggilan HTTP dikirim dari tab Playwright yang sudah login sebagai Dev User (`fetch` same-origin, cookie sesi asli). Pemindaian kode proyek nyata memanggil `scanProjectArtifacts` langsung dengan artefak dari database (baca saja).

## Hasil

| # | Klaim | Langkah | Hasil | Status |
|---|---|---|---|---|
| 24 | Run lewat Docker daemon host | `POST /api/run/cmuq5os110001vwynuox73g36` (proyek UI Test Shop) | 200, `runId sdlc-run-cmuq5os1-2c0aad46`, stack Static HTML, port host 53384. `docker ps`: `nginxinc/nginx-unprivileged:alpine` Up. `docker inspect`: `CapDrop=[ALL]`, `SecurityOpt=[no-new-privileges]`, `ReadonlyRootfs=true`, memori 1 GiB, PID 256. `GET http://localhost:53384/` 200 | Terealisasi |
| 24 | Hentikan run | `DELETE /api/run/<id>` tanpa header CSRF, lalu dengan header `x-csrf-token` dari cookie | 403 `Invalid or missing CSRF token`, lalu 200 `{"ok":true}`; `docker ps` 0 container | Terealisasi |
| 25 | Log container live (SSE) | `GET /api/run/<id>/logs/stream`, dibaca 6 detik | 200, `Content-Type: text/event-stream`, 23 event `data:` berisi log start-up nginx | Terealisasi |
| 27 | Pemindaian nyata lewat route | `POST /api/projects/<id>/scan` (UI Test Shop, 2 berkas HTML) | 200 dalam 84 detik; `toolsRun: semgrep, trivy`; `dependency-audit` dilewati dengan alasan `no supported dependency manifest`; skor 100 | Terealisasi |
| 27 | Deteksi di bawah flag isolasi | Probe kode rentan (`exec` + `eval` dari query, rahasia AWS, lodash 4.17.15) | Semgrep 3 temuan (detect-child-process, code-string-concat, direct-response-write); Trivy 51 temuan (mis. CVE-2020-8203, CVE-2021-23337) | Terealisasi |
| 27 | Audit dependency proyek nyata | `scanProjectArtifacts` atas artefak `campify` (159 berkas, hanya `package.json`) | `toolsRun: semgrep, trivy, npm-audit`; Semgrep 3, npm-audit 8 temuan; 135 detik | Terealisasi setelah perbaikan |
| 27 | pip-audit | Probe `requirements.txt` berisi `django==2.2.0` | `toolsRun` memuat `pip-audit`, 73 temuan | Terealisasi setelah perbaikan |
| 27 | Kegagalan audit tidak tersamar | Probe `package.json` dengan paket yang tidak ada | `npm-audit` masuk `toolsSkipped` (stderr `npm error code E404`), bukan 0 temuan | Terealisasi setelah perbaikan |

## Bug yang ditemukan dan diperbaiki

Uji #27 menemukan bahwa audit dependency Node belum pernah melaporkan temuan, karena dua sebab:

1. Proyek hasil generate hanya berisi `package.json`. `npm audit` selalu gagal dengan `ENOLOCK` (exit 1, stdout `{"error":{"code":"ENOLOCK"}}`).
2. `npm audit` dan `pip-audit` keluar dengan exit 1 setiap kali menemukan kerentanan. `runTool` memperlakukan exit ≠ 0 sebagai kegagalan dan membuang laporannya. Untuk pip-audit hal ini ditutupi dengan `|| true`, yang sekaligus membuat kegagalan `pip install` terbaca sebagai 0 temuan.

Perbaikan di commit `e843abb`, `src/lib/scanner/run.ts` dan `src/lib/scanner/parse.ts`:

- npm-audit lebih dulu menjalankan `npm install --package-lock-only --ignore-scripts` (stdout dibuang, galat tetap ke stderr). Perintah ini hanya menyusun lockfile, tanpa mengunduh paket atau menjalankan skrip paket.
- `runTool` menerima exit ≠ 0 hanya bila stdout lolos `isAuditReport` (npm: objek `vulnerabilities` tanpa `error`; pip-audit: array `dependencies`).
- `|| true` pada pip-audit dihapus.

Flag `--cap-drop ALL` dan `no-new-privileges` dari run keamanan tidak berperan dalam bug ini: `npm audit` memberi exit dan keluaran yang sama dengan maupun tanpa flag.

## Uji push GitHub

Sesi lanjutan 2026-11-24 (commit `d5a333f`) memakai Personal Access Token fine-grained milik pemilik repo, tersimpan terenkripsi di baris Dev User (`githubAccessTokenEncrypted`). Setiap langkah dikirim ke route aplikasi sendiri (`POST /api/github/push` lewat tab Playwright yang login sebagai Dev User); API GitHub hanya dipakai untuk memeriksa hasil, dan tidak ada token yang dicetak.

| # | Langkah | Hasil | Status |
|---|---|---|---|
| 13 | Repo baru dalam satu alur | `POST /api/github/push` dengan `repoName: shieldforge-uji-baru`, `visibility: private` | 200; repo private branch `main`; GitHub menulis `Initial commit` bf227ff, aplikasi menulis 6a9f1e5 berisi 8 berkas termasuk `.github/workflows/security.yml` | Terealisasi |
| 13 | Push ke repo existing | `POST /api/github/push` dengan `existingRepoUrl` repo `shieldforge-uji-dev` | 200; commit efc82ad di atas c80b560; isi root `.env.example .github README.md app.js docs index.html` | Terealisasi |
| 13 | Nama repo yang sudah dipakai | `repoName: shieldforge-uji-dev` tanpa `existingRepoUrl` | 400 "Repository name already exists on your GitHub." | Terealisasi |
| 13, 81b | PR revisi | dicoba pada sesi ketiga dengan proyek eduvista yang completed | Percobaan pertama 403 (`pull_requests` belum diizinkan); setelah izin diberikan, PR #1 terbuka | Terealisasi |

Bukti izin token diperiksa langsung ke API tanpa menulis data pada repo orang lain: `POST /user/repos` dengan body kosong menjawab 403 sebelum izin Administration diberikan dan 422 sesudahnya; `PUT /contents/probe2.txt` menjawab 201 setelah izin Contents diberikan; `PATCH /git/refs/heads/main` dengan SHA yang sama menjawab 200.

## Bug yang ditemukan saat uji GitHub

Proyek hasil generate selalu membawa `.github/workflows/security.yml`, dan GitHub menolak penulisan berkas workflow tanpa izin `Workflows`. Galatnya menyesatkan: status 403, **body kosong**, dan header `x-accepted-github-permissions: contents=write`, sehingga pesan lama menyuruh pengguna memeriksa izin yang salah. Dua probe membuktikannya: `POST /git/trees` tanpa berkas workflow menjawab 201, sedangkan dengan `.github/workflows/probe5.yml` saja menjawab 403.

Perbaikan di commit `d5a333f`: `githubPushError` menerima `{ hasWorkflows }`, dan route menghitungnya dari daftar berkas `buildProjectFiles`. Pesan sekarang menyebut `Contents: Read and write` dan `Workflows: Read and write`. README juga diperbarui (commit `d5b9c9f`) karena sebelumnya hanya menyebut PAT klasik `repo` scope.

## Uji AI, PDF, dan revisi

Sesi ketiga 2026-11-24 memakai akun pemilik `arifbillahv19@gmail.com` (kunci Gemini dan DeepSeek tersimpan, proyek `eduvista` berstatus completed, 113 berkas artefak). Login memakai provider kredensial aplikasi di instance lokal; sesi dikembalikan ke Dev User setelah uji.

| # | Langkah | Hasil | Status |
|---|---|---|---|
| 87b | Jawaban model sungguhan | `POST /api/chat` pada proyek Pengelolaan Tiket tahap 1 dengan prompt "Jelaskan dalam dua kalimat apa itu NIST SSDF." | Pesan `assistant` tersimpan berisi jawaban model (NIST SP 800-218 SSDF, empat kelompok PO/PS/PW/RV, dipetakan ke ISO/IEC 27001:2022 Annex A) beserta hasil Tahap 1 | Terealisasi |
| 19 | PDF Manual Book | `GET /api/export/doc?projectId=<eduvista>&type=manual&format=pdf` | 200 `application/pdf`, `attachment; filename="MANUAL-BOOK.pdf"`, 8.459 byte, 4 halaman, `%PDF-1.3` sampai `%%EOF` | Terealisasi |
| 19 | PDF laporan ISO | `GET /api/export/doc?type=iso&format=pdf` | 200 `application/pdf`, 5.100 byte, 1 halaman | Terealisasi |
| 91b | Export PDF dan GitHub push | gabungan #19 dan #13 | keduanya terbukti di sesi ini | Terealisasi |
| 81b | Release branch | `POST /api/revisions` pada eduvista (`v1.0` → `v1.1`) | 200; branch `release/v1.1` terbuat di repo uji dengan commit 5d6fb0a berisi 113 berkas; `githubPrUrl: null` | Terealisasi |
| 81b | Pull Request | `POST /api/revisions` diulang setelah izin Pull requests diberikan; branch `release/v1.1` sengaja dibiarkan ada untuk menguji `ensureBranch` | 200; branch lama dihapus dan dibuat ulang, PR #1 "Release v1.1 — eduvista" terbuka (`release/v1.1` → `main`), `prUrl` terisi, `githubWarning: null` | Terealisasi |
| 81b | Pembatalan revisi | `PATCH /api/revisions/<id>` dengan `{"status":"cancelled"}` | 200; proyek kembali `completed`, tahap 1 kembali `completed/100%`, dasbor menampilkan "Selesai (1), Revisi (0)" | Terealisasi |

Bug yang ditemukan di sesi ini:

1. Warning PR hanya menyuruh memeriksa token. Commit `3f2f0f8` menambahkan `githubRevisionWarning`, yang menyebut `Pull requests: Read and write` bila galatnya 403.
2. Percobaan ulang revisi setelah pembatalan tidak akan pernah membuat PR: `createRef` menjawab 422 karena branch `release/vX.Y` sudah ada, dan galatnya tertelan jadi warning. Commit `0886b22` menambahkan `ensureBranch` yang menghapus ref lama lalu membuatnya ulang dari commit dasar; terbukti pada percobaan kedua di atas.

## Belum diverifikasi

Tidak ada klaim yang tersisa. Batas metode yang tetap berlaku:

- Host Linux belum diuji; folder scan `mkdtemp` (mode 0700) mungkin tidak terbaca oleh root di container tanpa `CAP_DAC_OVERRIDE`. Sesi ini hanya membuktikan Docker Desktop Windows.
- Isi PDF diperiksa dari header, ukuran, dan jumlah halaman, bukan secara visual.
- Login OAuth GitHub tidak dijalankan (`AUTH_GITHUB_ID` kosong); jalur yang terbukti adalah Personal Access Token.
