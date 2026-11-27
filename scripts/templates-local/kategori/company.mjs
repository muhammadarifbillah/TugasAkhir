import { art, field, footer, topnav } from "../lib.mjs";

const NAV = ["Beranda", "Layanan", "Portofolio", "Tentang", "Tim", "Kontak"];
const SERVICES = [
  ["Strategi merek", "Riset pasar, posisi merek, dan arsitektur pesan yang konsisten."],
  ["Identitas visual", "Logo, palet warna, tipografi, dan panduan merek lengkap."],
  ["Situs & produk digital", "Desain dan pengembangan situs yang cepat dan mudah dikelola."],
  ["Kampanye & konten", "Konsep kampanye, foto produk, dan konten media sosial."],
  ["Desain ruang", "Penataan toko, kantor, dan pameran yang sejalan dengan merek."],
  ["Pendampingan tim", "Lokakarya agar tim internal bisa menjaga merek sendiri."],
];
const WORKS = [
  ["Kopi Kenangan Senja", "Identitas visual", "2026"],
  ["Bank Daerah Lestari", "Situs & produk digital", "2025"],
  ["Batik Sekar Jagad", "Strategi merek", "2025"],
  ["Festival Musik Danau Toba", "Kampanye & konten", "2024"],
  ["Rumah Sakit Bunda Kasih", "Desain ruang", "2024"],
  ["Koperasi Tani Makmur", "Identitas visual", "2023"],
];
const TEAM = [["Galih Pramudya", "Direktur kreatif"], ["Citra Ayuningtyas", "Kepala strategi"], ["Reza Firmansyah", "Desainer senior"], ["Dewi Lestari", "Manajer proyek"]];

const shell = (ctx, on, main) =>
  topnav(ctx.brand, NAV, on, `<a class="btn sm">Mulai proyek</a>`) +
  main +
  footer(ctx, [
    ["Layanan", ["Strategi merek", "Identitas visual", "Situs digital"]],
    ["Studio", ["Tentang", "Tim", "Karier"]],
    ["Kontak", [`proyek@${ctx.slug}.id`, "(021) 5790 1234", "Senin – Jumat 09.00–18.00"]],
  ]);

const work = ([n, c, y], i) => `<div>${art(i, 260)}<div class="row between" style="margin-top:12px"><h3>${n}</h3><span class="small muted">${y}</span></div><p class="small muted">${c}</p></div>`;

export function build(ctx) {
  return {
    home: shell(ctx, "Beranda", `<section class="hero"><div class="wrap sec" style="min-height:540px;display:flex;flex-direction:column;justify-content:center">
<p class="label" style="color:inherit;opacity:.85">Studio kreatif · Jakarta</p><h1 style="margin-top:14px;font-size:60px;max-width:900px">${ctx.tagline}</h1>
<p class="muted" style="margin-top:16px;max-width:560px">Kami membantu perusahaan Indonesia tampil jelas dan dipercaya: dari strategi merek sampai situs yang dipakai pelanggan setiap hari.</p>
<div class="row" style="margin-top:26px"><a class="btn">Lihat portofolio</a><a class="btn ghost" style="color:inherit;border-color:currentColor">Jadwalkan diskusi</a></div></div></section>
<section class="sec"><div class="wrap grid g4 keep-m">${[["140+", "proyek selesai"], ["12", "tahun berkarya"], ["38", "klien tetap"], ["9", "kota di Indonesia"]].map(([k, l]) => `<div><p class="kpi" style="font-size:36px">${k}</p><p class="muted small">${l}</p></div>`).join("")}</div></section>
<section><div class="wrap"><div class="row between"><h2>Karya pilihan</h2><a class="small" style="color:var(--accent);font-weight:600">Semua karya</a></div><div class="grid g3" style="margin-top:18px">${WORKS.slice(0, 3).map(work).join("")}</div></div></section>`),
    services: shell(ctx, "Layanan", `<main class="sec"><div class="wrap"><p class="label">Layanan</p><h1 style="margin-top:8px;font-size:42px;max-width:760px">Dari strategi sampai peluncuran, dikerjakan satu tim.</h1>
<div class="grid g3" style="margin-top:28px">${SERVICES.map(([h, p], i) => `<div class="card"><p class="label">0${i + 1}</p><h3 style="margin-top:10px">${h}</h3><p class="muted small" style="margin-top:8px">${p}</p></div>`).join("")}</div>
<div class="card hgrid" style="margin-top:28px;background:var(--hero);color:var(--hero-ink);border:0"><div><h2>Punya proyek dalam waktu dekat?</h2><p style="opacity:.85;margin-top:6px">Ceritakan kebutuhan Anda, kami balas dalam satu hari kerja.</p></div><div style="text-align:right"><a class="btn" style="background:var(--surface);color:var(--ink);border-color:var(--surface)">Hubungi kami</a></div></div></div></main>`),
    portfolio: shell(ctx, "Portofolio", `<main class="sec"><div class="wrap"><h1 style="font-size:42px">Portofolio</h1>
<div class="row wrapr" style="margin-top:16px">${["Semua", "Strategi merek", "Identitas visual", "Situs digital", "Kampanye", "Ruang"].map((c, i) => `<span class="chip${i === 0 ? " on" : ""}">${c}</span>`).join("")}</div>
<div class="grid g3" style="margin-top:24px">${WORKS.map(work).join("")}</div></div></main>`),
    portfolio_detail: shell(ctx, "Portofolio", `<main class="sec"><div class="wrap"><p class="small muted">Portofolio / Identitas visual</p><h1 style="margin-top:8px;font-size:44px">Kopi Kenangan Senja</h1>
<div class="grid g4 keep-m" style="margin-top:18px">${[["Klien", "PT Senja Rasa Nusantara"], ["Layanan", "Identitas visual"], ["Tahun", "2026"], ["Durasi", "10 minggu"]].map(([k, v]) => `<div><p class="label">${k}</p><p style="margin-top:4px"><b>${v}</b></p></div>`).join("")}</div>
<div style="margin-top:24px">${art(1, 380)}</div><div class="side" style="margin-top:24px"><div><h2>Tantangan</h2><p class="muted" style="margin-top:8px">Jaringan kedai kopi dengan 46 gerai ini tumbuh cepat, tetapi tampilan tiap gerai berbeda-beda. Pelanggan sulit mengenali merek di pusat belanja yang ramai.</p>
<h2 style="margin-top:22px">Pendekatan</h2><p class="muted" style="margin-top:8px">Kami menyusun logo baru yang terinspirasi langit sore, palet hangat, serta sistem kemasan yang mudah dicetak oleh pemasok lokal.</p></div>
<div class="card"><h3>Hasil</h3>${[["+32%", "pengunjung gerai baru"], ["46", "gerai berganti tampilan"], ["3 bulan", "waktu peluncuran"]].map(([k, l]) => `<div style="margin-top:14px"><p class="kpi" style="font-size:26px">${k}</p><p class="small muted">${l}</p></div>`).join("")}</div></div></div></main>`),
    about: shell(ctx, "Tentang", `<main class="sec"><div class="wrap hgrid"><div><p class="label">Tentang kami</p><h1 style="margin-top:10px;font-size:42px">Studio kecil dengan cara kerja yang rapi.</h1>
<p class="muted" style="margin-top:14px">Berdiri di Jakarta pada 2014, kami bekerja dengan perusahaan keluarga, BUMN, dan rintisan teknologi. Setiap proyek dipegang tim inti yang sama dari awal sampai akhir.</p>
<div class="grid g2" style="margin-top:22px">${[["Jujur soal waktu", "Jadwal disepakati di awal dan dilaporkan setiap minggu."], ["Paham konteks lokal", "Bahasa, budaya, dan kebiasaan pelanggan Indonesia."], ["Hasil bisa dirawat", "Panduan dan berkas sumber diserahkan lengkap."], ["Satu tim inti", "Tanpa oper-mengoper ke pihak lain."]].map(([h, p]) => `<div><h4>${h}</h4><p class="small muted" style="margin-top:4px">${p}</p></div>`).join("")}</div></div>
<div class="hide-m grid g2" style="gap:14px">${art(2, 300)}${art(3, 300, "margin-top:50px")}</div></div></main>
<section class="sec" style="background:var(--soft)"><div class="wrap"><h2>Perjalanan kami</h2><div class="grid g4 keep-m" style="margin-top:18px">${[["2014", "Studio berdiri di Kemang"], ["2017", "Klien pertama di luar Jawa"], ["2021", "Membuka divisi produk digital"], ["2026", "140 proyek selesai"]].map(([y, t]) => `<div class="card"><p class="kpi">${y}</p><p class="small muted">${t}</p></div>`).join("")}</div></div></section>`),
    team: shell(ctx, "Tim", `<main class="sec"><div class="wrap"><p class="label">Tim</p><h1 style="margin-top:8px;font-size:42px">Orang-orang di balik karya kami</h1>
<div class="grid g4 keep-m" style="margin-top:26px">${TEAM.map(([n, r], i) => `<div>${art(i + 1, 280)}<h3 style="margin-top:12px">${n}</h3><p class="small muted">${r}</p></div>`).join("")}</div>
<div class="card row between wrapr" style="margin-top:28px"><div><h3>Kami sedang mencari desainer produk</h3><p class="small muted" style="margin-top:4px">Penuh waktu · Jakarta atau jarak jauh</p></div><a class="btn">Lihat lowongan</a></div></div></main>`),
    contact: shell(ctx, "Kontak", `<main class="sec"><div class="wrap side"><div class="card"><h1 style="font-size:36px">Ceritakan proyek Anda</h1><p class="muted" style="margin-top:6px">Isi formulir singkat ini, tim kami membalas dalam satu hari kerja.</p>
<div class="grid g2" style="gap:0 16px">${field("Nama", "Ayu Wardhani")}${field("Perusahaan", "PT Lestari Pangan")}${field("Email", "ayu@lestaripangan.co.id")}${field("Perkiraan anggaran", "Rp 150 – 300 juta")}</div>
${field("Kebutuhan", "Kami ingin memperbarui logo dan kemasan untuk tiga lini produk baru.", true)}<a class="btn" style="margin-top:18px">Kirim pesan</a></div>
<div class="stack"><div class="card"><h3>Kantor</h3><p class="muted small" style="margin-top:6px">Jl. Kemang Selatan No. 88<br>Jakarta Selatan 12730</p></div><div class="card"><h3>Kontak langsung</h3><p class="muted small" style="margin-top:6px">proyek@${ctx.slug}.id<br>(021) 5790 1234</p></div>${art(0, 180)}</div></div></main>`),
  };
}
