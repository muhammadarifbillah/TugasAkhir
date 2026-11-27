const MENU = [
  ["Memulai", [["intro", "Pengantar"], ["quickstart", "Mulai cepat"], ["auth", "Autentikasi"]]],
  ["Referensi", [["endpoint", "Buat transaksi"], ["list", "Daftar transaksi"], ["refund", "Pengembalian dana"], ["schema", "Objek transaksi"]]],
  ["Panduan", [["code", "Contoh kode"], ["webhook", "Webhook"], ["errors", "Kode galat"]]],
];

const shell = (ctx, on, main, aside = "") => `<header class="nav"><div class="wrap row between" style="max-width:none;padding:0 28px"><a class="brand"><span class="logo"></span>${ctx.brand} <span class="chip" style="margin-left:6px">API v2</span></a>
<div class="row"><div class="input hide-m" style="width:300px">Cari dokumentasi…  Ctrl K</div><a class="small hide-m">Status layanan</a><a class="btn sm">Dasbor</a></div></div></header>
<div class="lside" style="gap:0"><aside class="sidebar hide-m">${MENU.map(([h, items]) => `<p class="label" style="margin:14px 0 6px 12px">${h}</p>${items.map(([id, l]) => `<a class="${id === on ? "on" : ""}">${l}</a>`).join("")}`).join("")}</aside>
<div style="display:grid;grid-template-columns:minmax(0,1fr) ${aside ? "460px" : "0"};gap:0"><main style="padding:34px 40px;max-width:820px">${main}</main>${aside ? `<aside class="hide-m" style="padding:34px 28px 34px 0">${aside}</aside>` : ""}</div></div>`;

const code = (title, body) => `<div class="code"><span class="c">${title}</span>\n${body}</div>`;
const curlCreate = `<span class="k">curl</span> -X POST https://api.contoh.id/v2/transaksi \\
  -H <span class="s">"Authorization: Bearer kunci_rahasia_uji"</span> \\
  -H <span class="s">"Content-Type: application/json"</span> \\
  -d <span class="s">'{
    "jumlah": 349000,
    "mata_uang": "IDR",
    "metode": "qris",
    "keterangan": "Pesanan #TB-20931"
  }'</span>`;
const response = `{
  <span class="k">"id"</span>: <span class="s">"trx_8f2a1c7d"</span>,
  <span class="k">"status"</span>: <span class="s">"menunggu_pembayaran"</span>,
  <span class="k">"jumlah"</span>: 349000,
  <span class="k">"mata_uang"</span>: <span class="s">"IDR"</span>,
  <span class="k">"qris_url"</span>: <span class="s">"https://bayar.contoh.id/q/8f2a"</span>,
  <span class="k">"kedaluwarsa"</span>: <span class="s">"2026-11-28T10:15:00+07:00"</span>
}`;

const params = [["jumlah", "integer", "wajib", "Nominal dalam rupiah, tanpa desimal."], ["mata_uang", "string", "wajib", "Saat ini hanya IDR."], ["metode", "string", "wajib", "qris, va_bca, va_mandiri, atau ewallet."], ["keterangan", "string", "opsional", "Teks bebas, maksimal 140 karakter."], ["kedaluwarsa_menit", "integer", "opsional", "Batas waktu bayar, bawaan 30 menit."]];

export function build(ctx) {
  return {
    intro: shell(ctx, "intro", `<section class="hero card" style="border:0;padding:32px"><p class="label" style="color:inherit">Dokumentasi</p><h1 style="margin-top:8px;font-size:40px">${ctx.tagline}</h1>
<p class="muted" style="margin-top:10px">Terima pembayaran QRIS, virtual account, dan dompet digital lewat satu API REST. Semua contoh di halaman ini memakai rupiah dan data uji.</p>
<div class="row" style="margin-top:20px"><a class="btn">Mulai cepat</a><a class="btn ghost" style="color:inherit">Lihat referensi</a></div></section>
<div class="grid g2" style="margin-top:24px">${[["Mulai cepat", "Transaksi pertama dalam lima menit."], ["Autentikasi", "Kunci uji dan kunci produksi."], ["Referensi endpoint", "Semua parameter dan respons."], ["Webhook", "Notifikasi saat status berubah."]].map(([h, p]) => `<div class="card"><h3>${h}</h3><p class="small muted" style="margin-top:6px">${p}</p></div>`).join("")}</div>
<h2 style="margin-top:28px">Alamat dasar</h2><p class="muted" style="margin-top:6px">Semua permintaan dikirim ke alamat berikut dengan format JSON.</p><div class="code" style="margin-top:12px">https://api.contoh.id/v2</div>`),
    quickstart: shell(ctx, "quickstart", `<p class="label">Memulai</p><h1 style="margin-top:6px;font-size:36px">Mulai cepat</h1><p class="muted" style="margin-top:8px">Ikuti tiga langkah ini untuk membuat transaksi uji pertama Anda.</p>
${[["1", "Ambil kunci uji", "Buka Dasbor → Pengaturan → Kunci API, lalu salin kunci yang diawali kunci_rahasia_uji."], ["2", "Buat transaksi", "Kirim permintaan POST ke /transaksi dengan jumlah dan metode pembayaran."], ["3", "Simulasikan pembayaran", "Di mode uji, buka qris_url dan tekan tombol Bayar untuk mengubah status menjadi lunas."]].map(([n, h, p]) => `<div class="row" style="align-items:flex-start;gap:16px;margin-top:22px"><span style="flex:none;width:34px;height:34px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:700">${n}</span><div><h3>${h}</h3><p class="muted small" style="margin-top:4px">${p}</p></div></div>`).join("")}
<div class="card" style="margin-top:24px;background:var(--soft)"><b>Catatan</b><p class="small muted" style="margin-top:4px">Kunci uji tidak pernah memindahkan uang sungguhan. Ganti ke kunci produksi setelah akun Anda diverifikasi.</p></div>`,
      code("# Permintaan", curlCreate) + `<div style="height:14px"></div>` + code("# Respons 201", response)),
    endpoint: shell(ctx, "endpoint", `<p class="label">Referensi</p><div class="row" style="margin-top:8px"><span class="mth post">POST</span><code style="font-size:16px">/v2/transaksi</code></div>
<h1 style="margin-top:10px;font-size:34px">Buat transaksi</h1><p class="muted" style="margin-top:8px">Membuat transaksi baru dan mengembalikan instruksi pembayaran sesuai metode yang dipilih.</p>
<h3 style="margin-top:24px">Parameter isi permintaan</h3><table style="margin-top:8px"><thead><tr><th>Nama</th><th>Tipe</th><th>Keterangan</th></tr></thead><tbody>
${params.map(([n, t, w, d]) => `<tr><td><code><b>${n}</b></code><p class="tiny" style="color:${w === "wajib" ? "#B0413E" : "var(--muted)"}">${w}</p></td><td class="muted">${t}</td><td>${d}</td></tr>`).join("")}</tbody></table>
<h3 style="margin-top:24px">Respons</h3>${[["201", "Transaksi dibuat", "ok"], ["400", "Parameter tidak valid", "warn"], ["401", "Kunci API salah atau tidak ada", "bad"]].map(([c, d, k]) => `<div class="row" style="margin-top:10px"><span class="tag ${k}">${c}</span><span class="small">${d}</span></div>`).join("")}`,
      code("# Contoh permintaan", curlCreate) + `<div style="height:14px"></div>` + code("# 201 Dibuat", response)),
    schema: shell(ctx, "schema", `<p class="label">Referensi</p><h1 style="margin-top:6px;font-size:34px">Objek transaksi</h1><p class="muted" style="margin-top:8px">Bentuk data yang dikembalikan oleh semua endpoint transaksi.</p>
<div class="card" style="margin-top:20px;padding:0">${[["id", "string", "Pengenal unik, diawali trx_."], ["status", "enum", "menunggu_pembayaran, lunas, kedaluwarsa, dibatalkan, dikembalikan."], ["jumlah", "integer", "Nominal dalam rupiah."], ["biaya_layanan", "integer", "Potongan per transaksi, dalam rupiah."], ["metode", "string", "Metode pembayaran yang dipakai pelanggan."], ["pelanggan", "objek", "Nama, email, dan nomor ponsel pelanggan."], ["dibuat", "string", "Waktu dibuat, format ISO 8601 WIB."], ["metadata", "objek", "Pasangan kunci-nilai bebas milik Anda."]].map(([n, t, d], i) => `<div class="row" style="padding:14px 18px;align-items:flex-start;${i ? "border-top:1px solid var(--line)" : ""}"><code style="width:160px;flex:none"><b>${n}</b></code><span class="chip" style="flex:none">${t}</span><span class="small" style="margin-left:8px">${d}</span></div>`).join("")}</div>`,
      code("# Contoh objek", response)),
    code: shell(ctx, "code", `<p class="label">Panduan</p><h1 style="margin-top:6px;font-size:34px">Contoh kode</h1><p class="muted" style="margin-top:8px">Pustaka resmi tersedia untuk Node.js, PHP, Python, dan Go.</p>
<div class="row" style="margin-top:18px">${["Node.js", "PHP", "Python", "Go"].map((l, i) => `<span class="chip${i === 0 ? " on" : ""}">${l}</span>`).join("")}</div>
${code("// Memasang pustaka: npm i @contoh/pembayaran", `<span class="k">import</span> { Pembayaran } <span class="k">from</span> <span class="s">"@contoh/pembayaran"</span>;

<span class="k">const</span> klien = <span class="k">new</span> Pembayaran(process.env.KUNCI_RAHASIA);

<span class="k">const</span> trx = <span class="k">await</span> klien.transaksi.buat({
  jumlah: 349000,
  metode: <span class="s">"qris"</span>,
  keterangan: <span class="s">"Pesanan #TB-20931"</span>,
});

console.log(trx.qris_url); <span class="c">// tampilkan kode QR ke pelanggan</span>`).replace('class="code"', 'class="code" style="margin-top:14px"')}
<h3 style="margin-top:24px">Menerima webhook</h3><p class="muted small" style="margin-top:6px">Periksa tanda tangan di header X-Tanda-Tangan sebelum memproses notifikasi, lalu balas dengan status 200.</p>`),
    auth: shell(ctx, "auth", `<p class="label">Memulai</p><h1 style="margin-top:6px;font-size:34px">Autentikasi</h1><p class="muted" style="margin-top:8px">Setiap permintaan menyertakan kunci rahasia di header Authorization dengan skema Bearer.</p>
<div class="grid g2" style="margin-top:20px"><div class="card"><span class="tag warn">Mode uji</span><p style="margin-top:10px"><code>kunci_rahasia_uji_…</code></p><p class="small muted" style="margin-top:6px">Untuk pengembangan. Transaksi tidak memindahkan uang.</p></div>
<div class="card"><span class="tag ok">Produksi</span><p style="margin-top:10px"><code>kunci_rahasia_prod_…</code></p><p class="small muted" style="margin-top:6px">Aktif setelah verifikasi usaha selesai.</p></div></div>
<h3 style="margin-top:24px">Simpan kunci di server</h3><p class="muted small" style="margin-top:6px">Jangan menaruh kunci rahasia di aplikasi seluler atau kode peramban. Gunakan variabel lingkungan dan ganti kunci secara berkala dari dasbor.</p>
<h3 style="margin-top:22px">Galat autentikasi</h3><table style="margin-top:8px"><tbody>${[["401", "kunci_tidak_ada", "Header Authorization kosong."], ["401", "kunci_tidak_valid", "Kunci salah atau sudah dicabut."], ["403", "mode_tidak_cocok", "Kunci uji dipakai untuk data produksi."]].map(([c, k, d]) => `<tr><td><span class="tag bad">${c}</span></td><td><code>${k}</code></td><td>${d}</td></tr>`).join("")}</tbody></table>`,
      code("# Header permintaan", `Authorization: Bearer kunci_rahasia_uji_51Hc9q
Content-Type: application/json
Idempotency-Key: 6c1e7f0a-pesanan-20931`)),
  };
}
