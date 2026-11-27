import { art, field, footer, loginPage, rp, stars, topnav } from "../lib.mjs";

const NAV = ["Beranda", "Kategori", "Promo", "Toko Pilihan", "Bantuan"];
const PRODUCTS = [
  ["Tas Anyaman Pandan Lombok", "Kriya Sasak", 349000, 425000, 5, "Mataram"],
  ["Kopi Arabika Gayo 500 g", "Kebun Takengon", 128000, 0, 5, "Aceh Tengah"],
  ["Kain Tenun Ikat Sumba", "Rumah Tenun Waingapu", 1250000, 0, 5, "Sumba Timur"],
  ["Sambal Roa Botol 200 ml", "Dapur Manado", 54000, 65000, 4, "Manado"],
  ["Sandal Kulit Garut", "Garut Leather", 189000, 0, 4, "Garut"],
  ["Madu Hutan Sumbawa 1 L", "Lebah Tambora", 215000, 240000, 5, "Sumbawa"],
  ["Batik Tulis Pekalongan", "Griya Batik Kauman", 675000, 0, 5, "Pekalongan"],
  ["Keripik Tempe Malang", "Camilan Bu Tini", 32000, 0, 4, "Malang"],
];

const productCard = ([name, shop, price, old, st, city], i) => `<div class="card" style="padding:12px">
${art(i, 170)}<p class="small muted" style="margin-top:10px">${shop} · ${city}</p><h4 style="margin-top:2px">${name}</h4>
<p style="margin-top:6px"><span class="price">${rp(price)}</span>${old ? `<span class="strike">${rp(old)}</span>` : ""}</p>
<p class="tiny muted" style="margin-top:4px">${stars(st)} · ${120 + i * 37} terjual</p></div>`;

const shell = (ctx, on, main) =>
  topnav(ctx.brand, NAV, on, `<div class="input hide-m" style="width:260px">Cari produk lokal…</div><a class="btn ghost sm hide-m">Masuk</a><a class="btn sm">Keranjang (2)</a>`) +
  main +
  footer(ctx, [
    ["Belanja", ["Kategori", "Promo minggu ini", "Toko pilihan", "Cara berbelanja"]],
    ["Penjual", ["Buka toko", "Pusat edukasi", "Biaya layanan"]],
    ["Bantuan", ["Lacak pesanan", "Pengembalian dana", "Hubungi kami"]],
  ]);

export function build(ctx) {
  const summary = `<div class="card"><h3>Ringkasan belanja</h3>
<div class="row between" style="margin-top:14px"><span class="muted">Subtotal (3 barang)</span><b>${rp(752000)}</b></div>
<div class="row between" style="margin-top:8px"><span class="muted">Ongkos kirim</span><b>${rp(24000)}</b></div>
<div class="row between" style="margin-top:8px"><span class="muted">Diskon voucer</span><b>-${rp(50000)}</b></div><hr class="rule">
<div class="row between"><b>Total</b><span class="price">${rp(726000)}</span></div>`;
  return {
    home: shell(ctx, "Beranda", `<section class="hero"><div class="wrap sec hgrid">
<div><span class="chip">Lebih dari 12.000 penjual lokal</span><h1 style="margin-top:16px">${ctx.tagline}</h1>
<p class="muted" style="margin-top:14px;max-width:520px">Belanja langsung dari perajin, petani, dan UMKM di seluruh Indonesia. Bandingkan harga antartoko, baca ulasan pembeli, dan bayar sekali untuk banyak penjual.</p>
<div class="row" style="margin-top:24px"><a class="btn">Mulai belanja</a><a class="btn ghost" style="color:inherit">Buka toko gratis</a></div></div>
<div class="hide-m">${art(1, 340)}</div></div></section>
<section class="sec tight"><div class="wrap"><div class="row wrapr">${["Kriya & Dekorasi", "Kopi & Teh", "Kain Nusantara", "Makanan Khas", "Fesyen Lokal", "Kecantikan"].map((c, i) => `<span class="chip${i === 0 ? " on" : ""}">${c}</span>`).join("")}</div></div></section>
<section><div class="wrap"><div class="row between"><h2>Pilihan minggu ini</h2><a class="small" style="color:var(--accent);font-weight:600">Lihat semua</a></div>
<div class="grid g4 keep-m" style="margin-top:18px">${PRODUCTS.slice(0, 4).map(productCard).join("")}</div></div></section>
<section class="sec"><div class="wrap grid g3">${[["Bayar sekali", "Satu pembayaran untuk barang dari beberapa toko sekaligus."], ["Ongkir hemat", "Subsidi ongkos kirim untuk pesanan di atas Rp 150.000."], ["Ulasan jujur", "Hanya pembeli yang sudah menerima barang yang bisa memberi ulasan."]].map(([h, p]) => `<div class="card"><h3>${h}</h3><p class="muted" style="margin-top:6px">${p}</p></div>`).join("")}</div></section>`),
    catalog: shell(ctx, "Kategori", `<main class="sec"><div class="wrap lside"><aside class="card hide-m"><h3>Saring</h3>
<p class="label" style="margin-top:16px">Kategori</p>${["Kriya & Dekorasi", "Kopi & Teh", "Kain Nusantara", "Makanan Khas"].map((c, i) => `<p class="small" style="margin-top:8px">${i === 0 ? "● " : "○ "}${c}</p>`).join("")}
<p class="label" style="margin-top:18px">Harga</p>${field("Minimum", "Rp 25.000")}${field("Maksimum", "Rp 1.500.000")}
<p class="label" style="margin-top:18px">Lokasi toko</p>${["Jawa Barat", "Bali & Nusa Tenggara", "Sumatra", "Sulawesi"].map((c) => `<p class="small" style="margin-top:8px">○ ${c}</p>`).join("")}</aside>
<div><p class="small muted">Beranda / Kategori / Kriya & Dekorasi</p><div class="row between" style="margin-top:6px"><h2>Kriya & Dekorasi</h2><span class="input small">Urutkan: Terlaris</span></div>
<p class="muted small" style="margin-top:4px">2.481 produk dari 316 toko</p>
<div class="grid g3 keep-m" style="margin-top:18px">${PRODUCTS.slice(0, 6).map(productCard).join("")}</div></div></div></main>`),
    product: shell(ctx, "Kategori", `<main class="sec"><div class="wrap"><p class="small muted">Beranda / Kriya & Dekorasi / Tas</p>
<div class="grid g2" style="margin-top:14px;gap:40px"><div>${art(2, 420)}<div class="grid g4" style="margin-top:12px;gap:10px">${[0, 1, 3, 2].map((s) => art(s, 80)).join("")}</div></div>
<div><span class="chip">Produk asli Lombok</span><h1 style="margin-top:12px;font-size:36px">Tas Anyaman Pandan Lombok</h1>
<p class="small muted" style="margin-top:8px">${stars(5)} 4,9 · 1.204 ulasan · 3.870 terjual</p>
<p style="margin-top:18px"><span class="price" style="font-size:30px">${rp(349000)}</span><span class="strike">${rp(425000)}</span> <span class="tag ok">Hemat 18%</span></p>
<p class="label" style="margin-top:22px">Warna</p><div class="row" style="margin-top:8px">${["Natural", "Cokelat tua", "Hitam"].map((c, i) => `<span class="chip${i === 0 ? " on" : ""}">${c}</span>`).join("")}</div>
<p class="muted" style="margin-top:18px">Dianyam tangan dari daun pandan pilihan oleh perajin Desa Sukarara. Lapisan dalam kain katun, tali kulit sintetis, ukuran 38 × 30 × 12 cm.</p>
<div class="row" style="margin-top:22px"><a class="btn">Beli sekarang</a><a class="btn ghost">+ Keranjang</a></div>
<div class="card row" style="margin-top:24px"><span class="avatar"></span><div style="flex:1"><b>Kriya Sasak</b><p class="small muted">Mataram, NTB · Aktif 5 menit lalu</p></div><a class="btn ghost sm">Kunjungi toko</a></div></div></div></div></main>`),
    cart: shell(ctx, "Beranda", `<main class="sec"><div class="wrap"><h2>Keranjang belanja</h2><div class="side" style="margin-top:18px"><div class="stack">
${[["Kriya Sasak", "Mataram", [PRODUCTS[0]]], ["Kebun Takengon", "Aceh Tengah", [PRODUCTS[1], PRODUCTS[3]]]].map(([shop, city, items], s) => `<div class="card"><p><b>${shop}</b> <span class="small muted">· ${city}</span></p>
${items.map((p, i) => `<div class="row" style="margin-top:14px"><div style="width:84px">${art(s + i, 84)}</div><div style="flex:1"><h4>${p[0]}</h4><p class="small muted">Jumlah: ${i + 1}</p></div><span class="price">${rp(p[2])}</span></div>`).join("")}</div>`).join("")}
</div><div>${summary}<a class="btn block" style="margin-top:18px">Lanjut ke pembayaran</a></div></div></div></div></main>`),
    checkout: shell(ctx, "Beranda", `<main class="sec"><div class="wrap"><h2>Pembayaran</h2><div class="side" style="margin-top:18px"><div class="stack">
<div class="card"><h3>Alamat pengiriman</h3><p style="margin-top:8px"><b>Rina Wulandari</b> · 0812-3456-7890</p><p class="muted small">Jl. Kemang Raya No. 18, Mampang Prapatan, Jakarta Selatan 12730</p></div>
<div class="card"><h3>Metode pembayaran</h3>${["Transfer virtual account BCA", "QRIS", "Dompet digital", "Bayar di tempat"].map((m, i) => `<div class="row card" style="margin-top:10px;padding:14px;${i === 1 ? "border-color:var(--accent)" : ""}"><span class="dot" style="opacity:${i === 1 ? 1 : 0.2}"></span>${m}</div>`).join("")}</div>
<div class="card"><h3>Pengiriman</h3><p class="muted small" style="margin-top:6px">Reguler 2–4 hari · ${rp(24000)}</p></div>
</div><div>${summary}<a class="btn block" style="margin-top:18px">Bayar ${rp(726000)}</a></div></div></div></div></main>`),
    seller: shell(ctx, "Toko Pilihan", `<section class="hero"><div class="wrap sec row" style="gap:24px"><span class="avatar lg"></span><div style="flex:1"><span class="chip">Toko pilihan</span>
<h1 style="margin-top:10px;font-size:38px">Kriya Sasak</h1><p class="muted">Kerajinan anyaman dari Desa Sukarara, Lombok Tengah · Bergabung sejak 2021</p></div>
<div class="hide-m row"><a class="btn">Ikuti toko</a><a class="btn ghost" style="color:inherit">Chat penjual</a></div></div></section>
<section class="sec tight"><div class="wrap grid g4 keep-m">${[["4,9", "Rating toko"], ["18.420", "Produk terjual"], ["± 1 jam", "Waktu balas"], ["98%", "Pesanan tepat waktu"]].map(([k, l]) => `<div class="card"><p class="kpi">${k}</p><p class="small muted">${l}</p></div>`).join("")}</div></section>
<section><div class="wrap"><div class="row"><span class="chip on">Semua produk</span><span class="chip">Tas</span><span class="chip">Hiasan dinding</span><span class="chip">Ulasan</span></div>
<div class="grid g4 keep-m" style="margin-top:18px">${PRODUCTS.slice(0, 4).map(productCard).join("")}</div></div></section>`),
    login: shell(ctx, "Beranda", loginPage(ctx, { lead: "Lanjutkan belanja dan pantau pesanan Anda.", side: `${art(3, 420)}<h2 style="margin-top:20px">Satu akun untuk ribuan toko lokal.</h2><p class="muted" style="margin-top:8px">Simpan alamat, kumpulkan voucer, dan lacak semua pesanan dari satu tempat.</p>` })),
  };
}
