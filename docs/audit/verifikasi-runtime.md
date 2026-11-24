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

## Belum diverifikasi

| # | Klaim | Alasan |
|---|---|---|
| 13 | Push GitHub: repo baru, existing, commit, PR | Tidak ada user dengan token GitHub, dan `AUTH_GITHUB_ID` kosong. Pemilik proyek memilih tidak memberi PAT |
| 19 | Unduh Manual Book dan laporan ISO PDF | Export hanya tersedia setelah kelima tahap selesai (`src/app/api/export/doc/route.ts:49`); proyek di sesi Dev User belum selesai |
| 81b | Release branch dan Pull Request revisi | Butir run dan log SSE terbukti (lihat #24, #25); butir GitHub butuh kredensial (#13) |
| 87b | Respons model AI sungguhan | Dev User tidak punya kunci AI, dan `DEFAULT_AI_API_KEY` kosong |
| 91b | Export PDF dan GitHub push | Butir runner preview dan log live terbukti (lihat #24, #25); butir PDF dan GitHub seperti #19 dan #13 |

Risiko yang tetap terbuka: di host Linux, folder scan yang dibuat `mkdtemp` (mode 0700) mungkin tidak terbaca oleh root di container tanpa `CAP_DAC_OVERRIDE`. Sesi ini hanya membuktikan Docker Desktop Windows.
