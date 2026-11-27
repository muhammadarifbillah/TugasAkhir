# Laporan Tukang — Putaran 1
## Ringkasan
- Status: berhasil
- Kelas: M
- Varian: Opus 5.5 (high) — omniroute/cc/claude-opus-5-5-high

## Langkah
- [x] 6A Red: test #1–#8 ditulis (`carrier.test.ts` ×4, `section-entrance.test.ts` ×2, `books.test.ts`, `category-viewer.test.ts`) -> 8 gagal, 46 lulus (lihat uji-red.txt). Commit `test(mandor/fuse-v2-r21): ...`
- [x] 6B Green:
  - `globals.css`: `@keyframes section-entrance` + `@supports (animation-timeline: view())` > `@media LANDING_MOTION_QUERY` > `.landing [data-entrance]` (view(), `entry 0% entry 40%`); `#main { scroll-behavior: smooth }` di bawah `prefers-reduced-motion: no-preference`. Blok reduce tidak diubah.
  - `landing-motion.tsx`: `useEffect` pemuat gsap/lenis dibuang; tersisa `DESKTOP_QUERY`, `isDesktop`, `useDesktopMotion`, `LandingMotion` (MotionConfig skipAnimations).
  - `motion.ts`: `shouldLoadLandingMotion` dihapus, komentar `LANDING_MOTION_QUERY` diganti sesuai spek.
  - `git rm` `landing-scroll-init.ts`, `landing-scroll-init.test.ts`, `section-entrance.ts`.
  - `book-shelf.tsx`, `category-viewer.tsx`: hanya `data-lenis-prevent=""` dihapus.
  - `layout.tsx`: komentar saja.
  - `npm uninstall gsap lenis --package-lock-only`; npm sendiri menghapus kedua baris di `package.json`.
  - `DESIGN-BLUEPRINT.md`: baris M2, baris ±656, paragraf menjadi "**Landing scroll (native)**", baris ±691; lisensi GSAP/Lenis dihapus, lisensi Anatomy kit tetap.
  - Commit `feat(mandor/fuse-v2-r21): drop gsap and lenis, CSS scroll-driven heading entrance`
- [ ] 6C Refactor: tidak perlu commit. `git grep` hanya menyisakan assert negatif di berkas test yang diizinkan, nama keyframes `section-entrance` di globals.css, dan baris blueprint ±176 (boleh tetap).

## Test yang dihapus/diganti + alasan
- `carrier.test.ts` "no static gsap/lenis import anywhere in src" → "no gsap or lenis import anywhere in src" (pola ditambah import dinamis `gsap|lenis|@gsap/`).
- `carrier.test.ts` "dynamic gsap/lenis import only in landing-motion.tsx": dihapus, digantikan #2 (import dinamis kini dilarang di semua tempat).
- `carrier.test.ts` "package.json pins gsap 3.15.x and lenis 1.3.x": dihapus, digantikan #1.
- `carrier.test.ts` "blueprint 7.1 allows landing GSAP + Lenis under PRD rules": diganti #4.
- `carrier.test.ts`: ditambah #3 "no data-lenis-prevent anywhere in src". "LandingMotion is mounted only by the landing page", "landing layout carrier" dan "anatomy kit" tidak diubah.
- `section-entrance.test.ts`: tiga test mock gsap (`entrance animates...`, `entrance cleanup...`, `entrance is a no-op...`), "entrance module is gated and has no runtime imports" dan "LandingMotion loads only gsap, ScrollTrigger, lenis and the entrance scene" dihapus karena modul `section-entrance.ts` dihapus. "section heading SSR is visible without JavaScript" dipertahankan tanpa perubahan isi. Ditambah #5 dan #6.
- `books.test.ts` / `category-viewer.test.ts`: `data-lenis-prevent` dipindah dari `toContain` ke `not.toContain`, ditambah `toContain("overflow-y-auto")`, nama test "blocks Lenis" → "scrolls natively".
- `landing-scroll-init.test.ts`: dihapus di commit GREEN bersama modulnya.
- `motion.test.ts`: describe `shouldLoadLandingMotion` dihapus di commit GREEN bersama fungsinya; describe `LANDING_MOTION_QUERY` tetap.

## Hasil Uji
```
$ npm run verify
> fuse@0.1.0 verify
> npm run typecheck && npm run lint && npm run check:dictionaries && npm run test
> fuse@0.1.0 typecheck
> tsc --noEmit
> fuse@0.1.0 lint
> eslint
> fuse@0.1.0 check:dictionaries
> tsx scripts/generate-dictionaries.ts
> fuse@0.1.0 test
> vitest run
 Test Files  58 passed (58)
      Tests  404 passed (404)
EXIT: 0
```
Kriteria §7: `git grep` gsap/lenis di package.json dan `node_modules/(gsap|lenis|@gsap/)` di lockfile kosong; `git diff --name-status main...HEAD` menunjukkan `D` untuk tiga berkas lama; tidak ada `+backdrop-blur`; semua berkas di diff ada di §4; `test(` mendahului `feat(`.

## Catatan
- Worktree tidak punya `node_modules` dan `src/generated` (Prisma client, gitignored), sehingga vitest/tsc gagal start. Saya membuat junction `node_modules` dan `src/generated` ke `..\TugasAkhir\...`. Keduanya di-ignore git; tidak ada install atau generate yang dijalankan.
- `npm uninstall gsap lenis --package-lock-only` selain menghapus entri gsap/lenis juga menambahkan 6 entri `node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/*` (`inBundle`, `optional`, dev) ke lockfile. Ini normalisasi npm dari perintah yang diwajibkan spek, tanpa dependensi baru di package.json. Mohon Mandor menilai apakah boleh diterima.
- Keadaan setelah R19/R20 sudah dibaca dulu; semua anchor edit cocok.
- Tidak memotret layar (sesuai §10). Entrance CSS baru belum dicek visual di browser.
