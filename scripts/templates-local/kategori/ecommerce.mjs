import { art, field, footer, loginPage, rp, stars, topnav } from "../lib.mjs";

const NAV = ["Beranda", "Koleksi", "Pria", "Wanita", "Aksesori", "Tentang"];
const ITEMS = [
  ["Kemeja Linen Lengan Pendek", 289000, 0, "Biru laut"],
  ["Celana Pendek Katun Chino", 219000, 259000, "Pasir"],
  ["Gaun Santai Motif Ombak", 349000, 0, "Putih gading"],
  ["Topi Anyaman Pantai", 129000, 0, "Natural"],
  ["Sandal Tali Kulit", 199000, 239000, "Cokelat"],
  ["Tas Kanvas Serbaguna", 179000, 0, "Abu batu"],
  ["Kaus Organik Basic", 149000, 0, "Hitam"],
  ["Kacamata Hitam Bingkai Bulat", 259000, 0, "Kura-kura"],
];

const card = ([name, price, old, color], i) => `<div>${art(i + 1, 240)}<div class="row between" style="margin-top:12px"><h4>${name}</h4></div>
<p class="small muted">${color}</p><p style="margin-top:4px"><span class="price">${rp(price)}</span>${old ? `<span class="strike">${rp(old)}</span>` : ""}</p></div>`;

const shell = (ctx, on, main) =>
  `<div style="background:var(--accent);color:var(--accent-ink);text-align:center;font-size:13px;padding:8px">Gratis ongkir ke seluruh Indonesia untuk belanja di atas Rp 300.000</div>` +
  topnav(ctx.brand, NAV, on, `<a class="small hide-m">Cari</a><a class="small hide-m">Akun</a><a class="btn sm">Tas (2)</a>`) +
  main +
  footer(ctx, [
    ["Belanja", ["Koleksi baru", "Pria", "Wanita", "Aksesori"]],
    ["Bantuan", ["Panduan ukuran", "Pengiriman", "Penukaran barang"]],
    ["Perusahaan", ["Tentang kami", "Karier", "Toko offline"]],
  ]);

const totals = `<div class="card"><h3>Ringkasan pesanan</h3>
<div class="row between" style="margin-top:14px"><span class="muted">Subtotal</span><b>${rp(508000)}</b></div>
<div class="row between" style="margin-top:8px"><span class="muted">Ongkos kirim</span><b>Gratis</b></div>
${field("Kode promo", "LIBURAN10")}<hr class="rule"><div class="row between"><b>Total</b><span class="price">${rp(457200)}</span></div>`;

export function build(ctx) {
  return {
    home: shell(ctx, "Beranda", `<section class="hero"><div class="wrap sec hgrid" style="min-height:520px">
<div><p class="label" style="color:inherit;opacity:.85">Koleksi musim kemarau 2026</p><h1 style="margin-top:12px;font-size:54px">${ctx.tagline}</h1>
<p class="muted" style="margin-top:14px;max-width:480px">Bahan linen dan katun yang sejuk, dijahit di Bandung, siap menemani perjalanan Anda dari kota sampai pantai.</p>
<div class="row" style="margin-top:24px"><a class="btn">Belanja koleksi</a><a class="btn ghost" style="color:inherit;border-color:currentColor">Lihat lookbook</a></div></div>
<div class="hide-m grid g2" style="gap:14px">${art(1, 400)}${art(2, 400, "margin-top:60px")}</div></div></section>
<section class="sec"><div class="wrap"><div class="row between"><h2>Paling dicari</h2><a class="small" style="color:var(--accent);font-weight:600">Lihat semua</a></div>
<div class="grid g4 keep-m" style="margin-top:18px">${ITEMS.slice(0, 4).map(card).join("")}</div></div></section>
<section><div class="wrap grid g3">${[["Gratis ongkir", "Untuk pesanan di atas Rp 300.000."], ["Tukar 30 hari", "Ukuran kurang pas? Tukar tanpa biaya."], ["Bayar mudah", "QRIS, transfer bank, atau cicilan 0%."]].map(([h, p]) => `<div class="card"><h3>${h}</h3><p class="muted small" style="margin-top:6px">${p}</p></div>`).join("")}</div></section>`),
    catalog: shell(ctx, "Koleksi", `<main class="sec"><div class="wrap"><p class="small muted">Beranda / Koleksi</p><h1 style="margin-top:8px;font-size:38px">Koleksi musim kemarau</h1>
<div class="row between wrapr" style="margin-top:18px"><div class="row wrapr">${["Semua", "Kemeja", "Celana", "Gaun", "Aksesori"].map((c, i) => `<span class="chip${i === 0 ? " on" : ""}">${c}</span>`).join("")}</div><span class="input small hide-m">Urutkan: Terbaru</span></div>
<div class="grid g4 keep-m" style="margin-top:22px">${ITEMS.map(card).join("")}</div></div></main>`),
    product: shell(ctx, "Pria", `<main class="sec"><div class="wrap"><p class="small muted">Beranda / Pria / Kemeja</p><div class="grid g2" style="margin-top:14px;gap:44px">
<div class="grid g2" style="gap:12px">${[1, 2, 3, 0].map((s) => art(s, 300)).join("")}</div>
<div><h1 style="font-size:36px">Kemeja Linen Lengan Pendek</h1><p class="small muted" style="margin-top:8px">${stars(5)} 4,8 · 362 ulasan</p>
<p class="price" style="font-size:28px;margin-top:16px">${rp(289000)}</p>
<p class="label" style="margin-top:22px">Warna: Biru laut</p><div class="row" style="margin-top:8px">${[0, 1, 2, 3].map((i) => `<span class="avatar" style="width:32px;height:32px;${i === 0 ? "outline:2px solid var(--accent);outline-offset:3px" : ""}"></span>`).join("")}</div>
<p class="label" style="margin-top:22px">Ukuran</p><div class="row" style="margin-top:8px">${["S", "M", "L", "XL", "XXL"].map((s, i) => `<span class="chip${i === 2 ? " on" : ""}" style="min-width:48px;justify-content:center">${s}</span>`).join("")}</div>
<div class="row" style="margin-top:24px"><a class="btn">Beli sekarang</a><a class="btn ghost">Tambah ke tas</a></div>
<div class="card" style="margin-top:24px"><h4>Detail produk</h4><p class="muted small" style="margin-top:6px">100% linen, tidak mudah kusut setelah dicuci. Kerah kubah, kancing batok kelapa, potongan lurus. Model memakai ukuran L, tinggi 178 cm.</p></div></div></div></div></main>`),
    cart: shell(ctx, "Koleksi", `<main class="sec"><div class="wrap"><h2>Tas belanja Anda</h2><div class="side" style="margin-top:18px"><div class="card">
${[ITEMS[0], ITEMS[1]].map((p, i) => `<div class="row" style="${i ? "margin-top:18px;padding-top:18px;border-top:1px solid var(--line)" : ""}"><div style="width:96px">${art(i, 110)}</div><div style="flex:1"><h4>${p[0]}</h4><p class="small muted">${p[3]} · Ukuran L</p><p class="small" style="margin-top:6px">Jumlah: 1 · <a style="color:var(--accent)">Hapus</a></p></div><span class="price">${rp(p[1])}</span></div>`).join("")}
</div><div>${totals}<a class="btn block" style="margin-top:18px">Lanjut ke pembayaran</a></div></div></div></div></main>`),
    checkout: shell(ctx, "Koleksi", `<main class="sec"><div class="wrap"><h2>Pembayaran</h2><div class="side" style="margin-top:18px"><div class="card">
<h3>Data penerima</h3><div class="grid g2" style="gap:0 16px">${field("Nama lengkap", "Dimas Prasetyo")}${field("Nomor ponsel", "0813-2233-4455")}</div>
${field("Alamat", "Jl. Cihampelas No. 120, Bandung 40131")}<div class="grid g2" style="gap:0 16px">${field("Kota", "Bandung")}${field("Kode pos", "40131")}</div>
<h3 style="margin-top:24px">Metode pembayaran</h3><div class="grid g3" style="margin-top:10px;gap:10px">${["QRIS", "Transfer bank", "Cicilan 0%"].map((m, i) => `<div class="card" style="padding:14px;text-align:center;${i === 0 ? "border-color:var(--accent);font-weight:600" : ""}">${m}</div>`).join("")}</div>
</div><div>${totals}<a class="btn block" style="margin-top:18px">Bayar sekarang</a></div></div></div></div></main>`),
    account: shell(ctx, "Tentang", `<main class="sec"><div class="wrap lside"><aside class="card hide-m"><div class="row"><span class="avatar"></span><div><b>Dimas Prasetyo</b><p class="tiny muted">Anggota sejak 2024</p></div></div>
<hr class="rule">${["Pesanan saya", "Alamat", "Daftar keinginan", "Poin & voucer", "Keluar"].map((l, i) => `<p style="margin-top:10px;${i === 0 ? "font-weight:700;color:var(--accent)" : ""}">${l}</p>`).join("")}</aside>
<div><h2>Pesanan saya</h2><div class="grid g3" style="margin-top:16px">${[["3", "Sedang dikirim"], ["14", "Selesai"], ["1.250", "Poin belanja"]].map(([k, l]) => `<div class="card"><p class="kpi">${k}</p><p class="small muted">${l}</p></div>`).join("")}</div>
<div class="card" style="margin-top:18px"><table><thead><tr><th>Nomor pesanan</th><th>Tanggal</th><th>Total</th><th>Status</th></tr></thead><tbody>
${[["#TB-20931", "21 Nov 2026", 457200, "Dikirim", "warn"], ["#TB-20457", "2 Nov 2026", 289000, "Selesai", "ok"], ["#TB-19980", "18 Okt 2026", 638000, "Selesai", "ok"], ["#TB-19412", "29 Sep 2026", 179000, "Dikembalikan", "bad"]].map(([n, d, t, s, c]) => `<tr><td><b>${n}</b></td><td>${d}</td><td>${rp(t)}</td><td><span class="tag ${c}">${s}</span></td></tr>`).join("")}
</tbody></table></div></div></div></main>`),
    login: shell(ctx, "Beranda", loginPage(ctx, { lead: "Pantau pesanan dan simpan daftar keinginan Anda.", side: `${art(2, 440)}<h2 style="margin-top:20px">Member baru dapat potongan 10%.</h2>` })),
  };
}
