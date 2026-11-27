import { art, field, footer, loginPage, rp, stars, topnav } from "../lib.mjs";

const NAV = ["Beranda", "Dokter", "Poli & Layanan", "Jadwal", "Kontak"];
const DOCTORS = [
  ["dr. Anisa Rahmawati, Sp.A", "Spesialis Anak", "Senin, Rabu, Jumat"],
  ["dr. Hendra Gunawan, Sp.PD", "Spesialis Penyakit Dalam", "Selasa, Kamis"],
  ["drg. Maya Kartika", "Dokter Gigi", "Senin – Sabtu"],
  ["dr. Teguh Prabowo, Sp.OG", "Spesialis Kandungan", "Rabu, Sabtu"],
  ["dr. Laras Pertiwi", "Dokter Umum", "Setiap hari"],
  ["dr. Arif Setiawan, Sp.KK", "Spesialis Kulit", "Selasa, Jumat"],
];
const DEPTS = [
  ["Poli Umum", "Pemeriksaan harian, surat keterangan sehat, dan rujukan."],
  ["Poli Anak", "Tumbuh kembang, imunisasi lengkap, dan konsultasi gizi."],
  ["Poli Gigi", "Pembersihan karang, tambal, dan perawatan saluran akar."],
  ["Poli Kandungan", "Pemeriksaan kehamilan dan USG empat dimensi."],
  ["Laboratorium", "Cek darah, gula, kolesterol, dengan hasil di hari yang sama."],
  ["Farmasi", "Obat resep dan antar ke rumah untuk wilayah Jakarta Selatan."],
];

const shell = (ctx, on, main) =>
  `<div style="background:var(--ink);color:var(--bg);font-size:13px;padding:8px 0"><div class="wrap row between"><span>Gawat darurat 24 jam: (021) 5790 1119</span><span class="hide-m">Jl. Wolter Monginsidi No. 9, Jakarta Selatan</span></div></div>` +
  topnav(ctx.brand, NAV, on, `<a class="btn sm">Buat janji</a>`) +
  main +
  footer(ctx, [
    ["Layanan", ["Poli umum", "Poli anak", "Laboratorium", "Farmasi"]],
    ["Pasien", ["Buat janji", "Jadwal dokter", "Asuransi rekanan"]],
    ["Jam buka", ["Senin – Jumat 07.00–21.00", "Sabtu 08.00–17.00", "IGD 24 jam"]],
  ]);

const docCard = ([n, s, d], i) => `<div class="card" style="padding:0;overflow:hidden">${art(i + 2, 190, "border-radius:0")}<div style="padding:16px"><h3>${n}</h3><p class="small muted">${s}</p><p class="small" style="margin-top:8px">Praktik: ${d}</p><a class="btn ghost sm" style="margin-top:12px">Lihat jadwal</a></div></div>`;

export function build(ctx) {
  return {
    home: shell(ctx, "Beranda", `<section class="hero"><div class="wrap sec hgrid" style="min-height:480px">
<div><span class="chip">Melayani keluarga sejak 2012</span><h1 style="margin-top:14px">${ctx.tagline}</h1>
<p class="muted" style="margin-top:14px;max-width:520px">Dokter umum dan spesialis, laboratorium, serta farmasi dalam satu gedung. Pesan jadwal dari rumah dan datang tepat waktu.</p>
<div class="row" style="margin-top:24px"><a class="btn">Buat janji temu</a><a class="btn ghost" style="color:inherit;border-color:currentColor">Cari dokter</a></div></div>
<div class="hide-m card" style="color:var(--ink)"><h3>Cari jadwal dokter</h3>${field("Poli", "Poli Anak")}${field("Tanggal", "Senin, 30 November 2026")}<a class="btn block" style="margin-top:16px">Lihat jadwal tersedia</a></div></div></section>
<section class="sec"><div class="wrap"><h2>Poli & layanan</h2><div class="grid g3" style="margin-top:18px">${DEPTS.slice(0, 3).map(([h, p]) => `<div class="card"><span class="avatar" style="width:40px;height:40px;border-radius:12px"></span><h3 style="margin-top:12px">${h}</h3><p class="muted small" style="margin-top:6px">${p}</p></div>`).join("")}</div></div></section>
<section><div class="wrap"><div class="row between"><h2>Dokter kami</h2><a class="small" style="color:var(--accent);font-weight:600">Semua dokter</a></div><div class="grid g4 keep-m" style="margin-top:18px">${DOCTORS.slice(0, 4).map(docCard).join("")}</div></div></section>`),
    doctors: shell(ctx, "Dokter", `<main class="sec"><div class="wrap"><h1 style="font-size:38px">Daftar dokter</h1><p class="muted" style="margin-top:6px">24 dokter umum dan spesialis siap melayani Anda.</p>
<div class="row wrapr" style="margin-top:18px"><div class="input" style="width:320px">Cari nama dokter…</div>${["Semua poli", "Anak", "Penyakit Dalam", "Gigi", "Kandungan", "Kulit"].map((c, i) => `<span class="chip${i === 0 ? " on" : ""}">${c}</span>`).join("")}</div>
<div class="grid g3" style="margin-top:22px">${DOCTORS.map(docCard).join("")}</div></div></main>`),
    doctor_detail: shell(ctx, "Dokter", `<main class="sec"><div class="wrap"><p class="small muted">Dokter / Spesialis Anak</p><div class="side" style="margin-top:14px">
<div><div class="row" style="gap:24px;align-items:flex-start"><span class="avatar xl"></span><div><h1 style="font-size:34px">dr. Anisa Rahmawati, Sp.A</h1><p class="muted">Spesialis Anak · 12 tahun pengalaman</p><p class="small" style="margin-top:8px">${stars(5)} 4,9 dari 860 ulasan pasien</p>
<div class="row wrapr" style="margin-top:12px"><span class="chip">Tumbuh kembang</span><span class="chip">Imunisasi</span><span class="chip">Alergi anak</span></div></div></div>
<h2 style="margin-top:30px">Tentang dokter</h2><p class="muted" style="margin-top:8px">Lulusan Fakultas Kedokteran Universitas Indonesia dan pendidikan spesialis anak di RSCM. Dikenal sabar menjelaskan kondisi anak kepada orang tua dengan bahasa yang mudah dipahami.</p>
<h2 style="margin-top:26px">Jadwal praktik</h2><table style="margin-top:10px"><tbody>${[["Senin", "08.00 – 12.00"], ["Rabu", "13.00 – 17.00"], ["Jumat", "08.00 – 11.00"]].map(([d, t]) => `<tr><td><b>${d}</b></td><td>${t}</td><td>Poli Anak, Lantai 2</td></tr>`).join("")}</tbody></table></div>
<div class="card"><h3>Pilih waktu</h3><p class="small muted" style="margin-top:4px">Senin, 30 November 2026</p><div class="grid g3" style="gap:8px;margin-top:12px">${["08.00", "08.30", "09.00", "09.30", "10.00", "10.30", "11.00", "11.30", "12.00"].map((t, i) => `<span class="chip${i === 3 ? " on" : ""}" style="justify-content:center;${i === 1 || i === 6 ? "opacity:.4;text-decoration:line-through" : ""}">${t}</span>`).join("")}</div>
<p class="small" style="margin-top:14px">Biaya konsultasi <b>${rp(250000)}</b></p><a class="btn block" style="margin-top:14px">Buat janji</a></div></div></div></main>`),
    booking: shell(ctx, "Jadwal", `<main class="sec"><div class="wrap"><h1 style="font-size:36px">Buat janji temu</h1>
<div class="row" style="margin-top:16px;gap:10px">${["1. Pilih dokter", "2. Data pasien", "3. Konfirmasi"].map((s, i) => `<span class="chip${i === 1 ? " on" : ""}">${s}</span>`).join("")}</div>
<div class="side" style="margin-top:20px"><div class="card"><h3>Data pasien</h3><div class="grid g2" style="gap:0 16px">${field("Nama pasien", "Kirana Putri Lestari")}${field("Tanggal lahir", "14 Maret 2021")}${field("Nomor ponsel orang tua", "0812-7788-9900")}${field("Nomor BPJS / asuransi", "0001 2345 6789")}</div>
${field("Keluhan", "Demam tiga hari, batuk berdahak, nafsu makan turun.", true)}
<label class="row small" style="margin-top:14px"><span class="input" style="width:18px;height:18px;padding:0;background:var(--accent)"></span>Pasien baru di klinik ini</label>
<div class="row" style="margin-top:20px"><a class="btn ghost">Kembali</a><a class="btn">Lanjut ke konfirmasi</a></div></div>
<div class="card"><h3>Ringkasan janji</h3><div class="row" style="margin-top:12px"><span class="avatar"></span><div><b>dr. Anisa Rahmawati, Sp.A</b><p class="small muted">Poli Anak</p></div></div><hr class="rule">
<p class="small"><b>Tanggal:</b> Senin, 30 November 2026</p><p class="small" style="margin-top:6px"><b>Jam:</b> 09.30 WIB</p><p class="small" style="margin-top:6px"><b>Lokasi:</b> Lantai 2, ruang 204</p></div></div></div></main>`),
    confirmation: shell(ctx, "Jadwal", `<main class="sec"><div class="wrap" style="max-width:760px"><div class="card" style="text-align:center;padding:40px">
<span style="display:inline-grid;place-items:center;width:76px;height:76px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-size:36px">✓</span>
<h1 style="font-size:32px;margin-top:18px">Janji temu Anda sudah terdaftar</h1><p class="muted" style="margin-top:8px">Kami mengirim rincian ke WhatsApp 0812-7788-9900. Datang 15 menit lebih awal untuk pendaftaran ulang.</p>
<div class="card" style="text-align:left;margin-top:24px;background:var(--soft)"><div class="grid g2">${[["Nomor antrean", "A-017"], ["Pasien", "Kirana Putri Lestari"], ["Dokter", "dr. Anisa Rahmawati, Sp.A"], ["Waktu", "Senin, 30 Nov 2026 · 09.30"], ["Lokasi", "Lantai 2, ruang 204"], ["Estimasi biaya", rp(250000)]].map(([k, v]) => `<div><p class="label">${k}</p><p style="margin-top:2px"><b>${v}</b></p></div>`).join("")}</div></div>
<div class="row" style="justify-content:center;margin-top:24px"><a class="btn">Tambah ke kalender</a><a class="btn ghost">Ubah jadwal</a></div></div></div></main>`),
    departments: shell(ctx, "Poli & Layanan", `<section class="hero"><div class="wrap sec"><h1 style="font-size:40px">Poli & layanan</h1><p class="muted" style="margin-top:8px;max-width:600px">Semua layanan tersedia di satu gedung, dengan hasil laboratorium yang langsung terhubung ke dokter Anda.</p></div></section>
<main class="sec"><div class="wrap grid g3">${DEPTS.map(([h, p], i) => `<div class="card">${art(i, 120)}<h3 style="margin-top:14px">${h}</h3><p class="muted small" style="margin-top:6px">${p}</p><a class="small" style="display:inline-block;margin-top:10px;color:var(--accent);font-weight:600">Lihat dokter →</a></div>`).join("")}</div></main>`),
    login: shell(ctx, "Beranda", loginPage(ctx, { lead: "Lihat riwayat kunjungan dan hasil laboratorium Anda.", side: `${art(1, 420)}<h2 style="margin-top:20px">Rekam medis keluarga dalam satu akun.</h2>` })),
  };
}
