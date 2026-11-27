import { art, footer } from "../lib.mjs";

const RUBRIK = ["Terkini", "Nasional", "Ekonomi", "Kota", "Teknologi", "Olahraga", "Gaya Hidup", "Opini"];
const STORIES = [
  ["Ekonomi", "Harga cabai turun menjelang akhir tahun, pedagang pasar induk lega", "Rahmat Hidayat", "8 menit baca"],
  ["Kota", "Jalur sepeda baru di Sudirman mulai dipakai warga setiap pagi", "Fitri Handayani", "4 menit baca"],
  ["Teknologi", "Rintisan Bandung kembangkan aplikasi pencatat panen untuk petani", "Yudha Pratama", "6 menit baca"],
  ["Nasional", "Musim hujan datang lebih awal, BMKG imbau warga pesisir waspada", "Sinta Maharani", "5 menit baca"],
  ["Olahraga", "Tim voli putri Jawa Timur melaju ke final kejuaraan nasional", "Bagus Wicaksono", "3 menit baca"],
  ["Gaya Hidup", "Kedai teh tradisional kembali digemari anak muda di Yogyakarta", "Nurul Aini", "4 menit baca"],
];

const masthead = (ctx, on) => `<header style="background:var(--surface);border-bottom:1px solid var(--line)"><div class="wrap row between" style="height:44px;font-size:12px;color:var(--muted)"><span>Sabtu, 28 November 2026</span><span class="hide-m">Jakarta 29°C · Berawan</span><span><a class="btn sm">Berlangganan</a></span></div>
<div class="hero"><div class="wrap" style="text-align:center;padding-top:26px;padding-bottom:22px"><h1 style="font-family:Georgia,serif;font-size:56px;letter-spacing:.01em">${ctx.brand}</h1><p class="muted small" style="margin-top:4px">${ctx.tagline}</p></div></div>
<nav class="wrap row hide-m" style="height:48px;justify-content:center;gap:26px;font-size:14px">${RUBRIK.map((r) => `<a style="${r === on ? "font-weight:700;color:var(--accent);box-shadow:inset 0 -2px 0 var(--accent);padding-bottom:4px" : "color:var(--muted)"}">${r}</a>`).join("")}</nav></header>`;

const shell = (ctx, on, main) =>
  masthead(ctx, on) + main + footer(ctx, [["Rubrik", ["Nasional", "Ekonomi", "Kota", "Teknologi"]], ["Redaksi", ["Tentang kami", "Pedoman media siber", "Kode etik"]], ["Layanan", ["Berlangganan", "Iklan", "Kirim tulisan"]]]);

const item = ([cat, t, who, time], i, big = false) => `<article>${art(i, big ? 360 : 170)}<p class="label" style="margin-top:12px;color:var(--accent)">${cat}</p><h${big ? 2 : 3} style="margin-top:6px;font-family:Georgia,serif;${big ? "font-size:32px" : ""}">${t}</h${big ? 2 : 3}><p class="small muted" style="margin-top:6px">${who} · ${time}</p></article>`;

export function build(ctx) {
  return {
    home: shell(ctx, "Terkini", `<main class="sec"><div class="wrap"><div class="side">
${item(STORIES[0], 1, true)}<div><p class="label">Terpopuler hari ini</p>${STORIES.slice(1, 5).map(([c, t], i) => `<div style="display:flex;gap:14px;margin-top:16px;padding-bottom:14px;border-bottom:1px solid var(--line)"><b style="font-size:28px;color:var(--accent);font-family:Georgia,serif">${i + 1}</b><div><p class="tiny muted">${c}</p><h4 style="font-family:Georgia,serif">${t}</h4></div></div>`).join("")}</div></div>
<hr class="rule" style="margin:30px 0"><div class="grid g4 keep-m">${STORIES.slice(1, 5).map((s, i) => item(s, i + 2)).join("")}</div></div></main>`),
    article: shell(ctx, "Ekonomi", `<main class="sec"><div class="wrap side"><article><p class="label" style="color:var(--accent)">Ekonomi · Pangan</p>
<h1 style="margin-top:10px;font-family:Georgia,serif;font-size:42px">Harga cabai turun menjelang akhir tahun, pedagang pasar induk lega</h1>
<div class="row" style="margin-top:16px"><span class="avatar" style="width:40px;height:40px"></span><div><b class="small">Rahmat Hidayat</b><p class="tiny muted">28 November 2026, 06.15 WIB · 8 menit baca</p></div></div>
<div style="margin-top:20px">${art(2, 360)}</div><p class="tiny muted" style="margin-top:6px">Ilustrasi: suasana bongkar muat sayur di pasar induk pada dini hari.</p>
<div style="margin-top:18px;font-size:17px;line-height:1.75;font-family:Georgia,serif"><p>Harga cabai rawit merah di Pasar Induk Kramat Jati turun menjadi Rp 38.000 per kilogram pada Jumat pagi, setelah sempat menyentuh Rp 72.000 pada awal bulan.</p>
<p style="margin-top:14px">"Pasokan dari Garut dan Brebes sudah normal lagi. Pembeli juga kembali ramai," kata Sutrisno, pedagang yang sudah berjualan di pasar itu selama 20 tahun.</p>
<p style="margin-top:14px">Dinas Ketahanan Pangan memperkirakan harga tetap stabil hingga akhir Desember, selama cuaca di sentra produksi tidak memburuk.</p></div></article>
<aside class="stack"><div class="card"><h3>Berita terkait</h3>${STORIES.slice(3, 6).map(([c, t]) => `<p class="tiny muted" style="margin-top:14px">${c}</p><h4 style="font-family:Georgia,serif">${t}</h4>`).join("")}</div>
<div class="card" style="background:var(--hero);color:var(--hero-ink);border:0"><h3>Kabar pagi di surel Anda</h3><p class="small" style="opacity:.85;margin-top:6px">Ringkasan lima berita penting setiap pukul 06.00.</p><a class="btn" style="margin-top:14px;background:var(--surface);color:var(--ink);border-color:var(--surface)">Daftar gratis</a></div></aside></div></main>`),
    category: shell(ctx, "Kota", `<main class="sec"><div class="wrap"><p class="label">Rubrik</p><h1 style="margin-top:6px;font-family:Georgia,serif;font-size:44px">Kota</h1><p class="muted" style="margin-top:6px">Transportasi, ruang publik, dan kehidupan warga Jakarta dan sekitarnya.</p>
<div class="row wrapr" style="margin-top:16px">${["Semua", "Transportasi", "Lingkungan", "Pendidikan", "Kesehatan"].map((c, i) => `<span class="chip${i === 0 ? " on" : ""}">${c}</span>`).join("")}</div>
<div class="grid g3" style="margin-top:24px">${STORIES.map((s, i) => item(["Kota", s[1], s[2], s[3]], i)).join("")}</div></div></main>`),
    author: shell(ctx, "Opini", `<main class="sec"><div class="wrap"><div class="card row" style="gap:26px;padding:30px"><span class="avatar xl"></span><div><p class="label">Penulis</p><h1 style="margin-top:6px;font-family:Georgia,serif;font-size:40px">Fitri Handayani</h1>
<p class="muted" style="margin-top:8px;max-width:620px">Wartawan kota sejak 2015. Menulis tentang transportasi umum, ruang hijau, dan cara warga Jakarta beradaptasi dengan kotanya.</p>
<div class="row" style="margin-top:14px;gap:22px"><span class="small"><b>412</b> artikel</span><span class="small"><b>18.300</b> pengikut</span><a class="btn sm">Ikuti penulis</a></div></div></div>
<h2 style="margin-top:30px;font-family:Georgia,serif">Tulisan terbaru</h2><div class="grid g3" style="margin-top:16px">${[STORIES[1], STORIES[3], STORIES[5]].map((s, i) => item(s, i + 1)).join("")}</div></div></main>`),
    search: shell(ctx, "Terkini", `<main class="sec"><div class="wrap" style="max-width:900px"><div class="input" style="height:56px;font-size:17px;color:var(--ink)">banjir rob pesisir utara</div>
<p class="small muted" style="margin-top:12px">Menampilkan 128 hasil untuk "banjir rob pesisir utara"</p>
<div class="row wrapr" style="margin-top:12px">${["Semua waktu", "Hari ini", "Minggu ini", "Bulan ini"].map((c, i) => `<span class="chip${i === 2 ? " on" : ""}">${c}</span>`).join("")}</div>
${[["Nasional", "Warga Muara Angke tinggikan lantai rumah menghadapi banjir rob", "26 Nov 2026"], ["Kota", "Tanggul laut sepanjang 4 kilometer rampung tahun depan", "24 Nov 2026"], ["Lingkungan", "Mangrove ditanam di pesisir Bekasi untuk menahan abrasi", "22 Nov 2026"], ["Ekonomi", "Nelayan Cilincing pindah ke dermaga baru setelah rob berulang", "20 Nov 2026"]].map(([c, t, d], i) => `<div class="row" style="gap:18px;margin-top:20px;padding-bottom:18px;border-bottom:1px solid var(--line);align-items:flex-start"><div style="width:180px;flex:none">${art(i, 110)}</div><div><p class="label" style="color:var(--accent)">${c}</p><h3 style="font-family:Georgia,serif;margin-top:4px">${t}</h3><p class="small muted" style="margin-top:6px">${d}</p></div></div>`).join("")}</div></main>`),
  };
}
