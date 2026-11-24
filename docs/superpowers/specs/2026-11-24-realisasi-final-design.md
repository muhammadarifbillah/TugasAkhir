# Realisasi Final: Menutup Klaim Audit + Run di Tahap Serah Terima

Tanggal: 2026-11-24
Sumber audit: `docs/audit/matriks-realisasi.md` (160 klaim; 103 Terealisasi, 47 Sebagian, 1 Belum, 9 Tidak dapat diverifikasi)

## Intent

Skripsi ini mengklaim ShieldForge adalah generator website dengan Secure SDLC. Penguji akan membaca dokumen proyek dan mencocokkannya dengan kode. Audit menemukan 57 klaim yang belum sepenuhnya benar. Tujuannya: setiap klaim di README, `teknologi-shieldforge.md`, dan `DESIGN-BLUEPRINT.md` aman dikutip, dan pengguna bisa menjalankan aplikasi hasil generate di tahap terakhir, bukan hanya di tahap Pengembangan.

## Goals

1. Klaim **keamanan** yang belum benar dipenuhi lewat kode: #75 isolasi container scanner, #79b audit log, #80 validasi Zod.
2. Klaim **aksesibilitas** yang belum benar dipenuhi lewat kode: #125 navigasi panah, #126b `aria-label` tombol ikon, #126c peran dialog.
3. Tombol **Jalankan** (`RunWorkspace` layar penuh: editor, pratinjau, terminal) tersedia di tahap 5 Serah Terima, sama seperti di tahap 3.
4. Semua klaim lain yang Sebagian/Belum diselesaikan dengan **memperbaiki dokumen** memakai usulan teks di bagian 5 matriks.
5. Sembilan klaim runtime (kelompok D) dibuktikan dalam satu sesi uji manual dan hasilnya dicatat.

## Non-goals

- Tidak menambah GET/DELETE proyek (#78b), tidak menyatukan transaksi AI (#86a), tidak menghubungkan 13 task SSDF tambahan ke tahap (#48), tidak menambah animasi menu (#118), tidak mengembalikan badge hero (#135). Semuanya diselesaikan di dokumen.
- Tidak membuat route halaman baru untuk Run; overlay `RunWorkspace` yang ada dipakai ulang.
- Tidak mengubah tata letak atau tema studio.

## Anti-goals

- Klaim keamanan "diperbaiki" hanya dengan melunakkan kalimat, padahal kodenya mudah dipenuhi.
- Hardening scanner yang membuat Semgrep/Trivy/audit diam-diam berhenti berjalan. Kegagalan harus tetap muncul sebagai `toolsSkipped`, lalu diuji nyata di sesi D.
- Audit log yang mencatat data pribadi (email, password).

## Constraints

- `npm run build` dilarang di working copy selama `next dev` berjalan (AGENTS.md). Verifikasi memakai `npx tsc --noEmit`, `npx vitest run`, `npm run lint`.
- Unit test hanya mencakup `src/lib/**` (vitest `environment: "node"`). Logika baru yang bisa diuji diletakkan di `src/lib` sebagai fungsi murni; wiring UI dan route diverifikasi dengan typecheck dan uji manual.
- Kamus `src/dictionaries/en.json` dan `id.json` wajib berkunci identik (`npm run check:dictionaries`).
- Migrasi Prisma di Windows butuh dev server dihentikan dulu (query engine terkunci).
- Commit lokal per task; tidak ada push.

## Approaches

**Run di Serah Terima.**
1. *Dipilih:* tampilkan tombol Jalankan yang sama di tahap `handover`, membuka `RunWorkspace` yang sama. Cukup satu kondisi, perilakunya identik dengan tahap 3.
2. Route baru `/studio/[id]/run`: harus memindahkan state editor dan run dari studio. Kerjanya besar, hasilnya sama.
3. Tombol di Serah Terima yang melempar ke tahap 3: membingungkan dan memaksa pengguna keluar dari tahap aktif.

**Klaim yang belum benar.**
1. *Dipilih:* klaim keamanan dan aksesibilitas dipenuhi lewat kode; sisanya diperbaiki di dokumen.
2. Semua diperbaiki lewat kode: #78b, #86a, #48, dan #118 menambah fitur yang tidak dibutuhkan skripsi.
3. Semua diperbaiki di dokumen: melemahkan klaim keamanan, yang justru inti skripsi.

## Decisions (disepakati)

- Pembagian kode vs dokumen sesuai tabel "Rencana final" yang disetujui pada 2026-11-24.
- Run di Serah Terima memakai `RunWorkspace` yang ada.
- Sesi uji D: Docker menyala, satu token GitHub, satu API key; hasilnya dicatat di `docs/audit/verifikasi-runtime.md`.

## Builder's calls (keputusan saya, bisa dikoreksi)

- Registrasi dicatat dengan nilai enum baru `REGISTER` (migrasi Prisma). Generate desain memakai `UPDATE_PROJECT` dengan `details.action = "generate_design"`, mengikuti pola `user/github/route.ts:26`.
- Validasi body dipusatkan di `src/lib/api-schemas.ts` dengan helper `parseJsonBody`, supaya body JSON rusak menghasilkan 400, bukan 500.
- Flag isolasi scanner diterapkan lewat satu pembangun argumen `scannerDockerArgs`, agar keempat container tidak bisa berbeda lagi.
- Navigasi panah menu memakai fungsi murni `rovingIndex` yang diekstrak dari `tabKeyNav`.
- `DESIGN-BLUEPRINT.md` bagian yang menyimpang ditulis ulang sekali jalan dari kode, bukan ditambal per baris.
