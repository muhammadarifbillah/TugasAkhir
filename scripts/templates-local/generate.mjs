// Writes the static HTML of the 24 FUSE example templates to scripts/templates-local/site/<category>/<slug>/<page>.html
// plus site/manifest.json (read by capture.py).
// Usage: node scripts/templates-local/generate.mjs [--only <category>/<slug>]
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_TEMPLATES } from "../../src/lib/site-templates.ts";
import { VARIANTS, doc } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "site");

/** One headline per template: the hero sentence and the footer blurb. */
const TAGLINES = {
  "pasar-padang": "Pasar daring untuk produk lokal pilihan Nusantara.",
  "lapak-terang": "Ribuan lapak UMKM, satu keranjang belanja.",
  "bursa-malam": "Bursa kriya dan kuliner khas daerah.",
  "toko-bahari": "Perlengkapan pantai dan pakaian santai untuk liburan.",
  "butik-putih": "Pakaian harian yang sederhana, rapi, dan tahan lama.",
  "galeri-arang": "Koleksi terbatas dari desainer muda Indonesia.",
  "akademi-curug": "Belajar keterampilan baru dengan tenang dan terarah.",
  "kelas-terang": "Kursus daring singkat untuk karier digital.",
  "pustaka-malam": "Kelas mendalam bersama praktisi berpengalaman.",
  "dasbor-senja": "Pantau penjualan dan pelanggan dalam satu layar.",
  "panel-jernih": "Dasbor operasional yang mudah dibaca seluruh tim.",
  "konsol-malam": "Konsol analitik untuk tim produk yang bergerak cepat.",
  "klinik-samudra": "Layanan kesehatan keluarga yang ramah dan dekat.",
  "klinik-sehati": "Buat janji dengan dokter tanpa antre panjang.",
  "klinik-nirmala": "Klinik spesialis dengan jadwal yang jelas.",
  "studio-savana": "Studio desain dan strategi merek dari Jakarta.",
  "karya-lapang": "Konsultan arsitektur dan tata ruang kantor.",
  "biro-arang": "Biro kreatif untuk kampanye dan konten merek.",
  "kabar-fajar": "Kabar pagi yang ringkas, jernih, dan berimbang.",
  "warta-terang": "Berita kota dan daerah setiap hari.",
  "harian-senyap": "Laporan mendalam dan opini pilihan.",
  "dok-salju": "Dokumentasi API pembayaran untuk pengembang.",
  "referensi-jernih": "Referensi API tagihan yang ringkas dan jelas.",
  "terminal-malam": "API pembayaran untuk aplikasi dan toko daring Anda.",
};

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
if (!only) rmSync(SITE, { recursive: true, force: true });

const manifest = [];
for (const [category, list] of Object.entries(SITE_TEMPLATES)) {
  const { build } = await import(`./kategori/${category}.mjs`);
  list.forEach((tpl, i) => {
    const variant = VARIANTS[i];
    const ctx = { category, variant, slug: tpl.slug, brand: tpl.name, tagline: TAGLINES[tpl.slug] };
    if (!ctx.tagline) throw new Error(`no tagline for ${tpl.slug}`);
    const pages = build(ctx);
    const ids = tpl.pages.map((p) => p.id);
    for (const id of ids) if (!pages[id]) throw new Error(`${category}/${tpl.slug}: page ${id} missing`);
    manifest.push({ category, slug: tpl.slug, pages: ids });
    if (only && only !== `${category}/${tpl.slug}`) return;
    for (const id of ids) {
      const file = join(SITE, category, tpl.slug, `${id}.html`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, doc({ title: `${tpl.name}`, category, variant, body: pages[id] }), "utf8");
    }
  });
}
mkdirSync(SITE, { recursive: true });
writeFileSync(join(SITE, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`generated ${manifest.reduce((n, t) => n + t.pages.length, 0)} pages for ${manifest.length} templates${only ? ` (only ${only})` : ""}`);
