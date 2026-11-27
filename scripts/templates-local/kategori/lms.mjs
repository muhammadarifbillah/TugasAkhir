import { art, footer, loginPage, rp, stars, topnav } from "../lib.mjs";

const NAV = ["Beranda", "Kursus", "Pengajar", "Untuk Perusahaan", "Blog"];
const COURSES = [
  ["Dasar Desain Antarmuka", "Nadia Putri", "Pemula", 24, 199000, "Desain"],
  ["Analisis Data dengan Python", "Bayu Santoso", "Menengah", 36, 349000, "Data"],
  ["Pemasaran Digital untuk UMKM", "Sari Hartono", "Pemula", 18, 149000, "Bisnis"],
  ["Pemrograman Web Modern", "Andi Wijaya", "Menengah", 42, 399000, "Pemrograman"],
  ["Fotografi Produk dengan Ponsel", "Lestari Ayu", "Pemula", 12, 99000, "Kreatif"],
  ["Manajemen Proyek Agile", "Rizky Maulana", "Lanjutan", 20, 279000, "Bisnis"],
];
const TEACHERS = [
  ["Nadia Putri", "Desainer produk, 9 tahun", "12.400 siswa"],
  ["Bayu Santoso", "Analis data, 11 tahun", "18.900 siswa"],
  ["Sari Hartono", "Konsultan pemasaran", "9.300 siswa"],
  ["Andi Wijaya", "Insinyur perangkat lunak", "21.700 siswa"],
];

const courseCard = ([t, who, lvl, n, price, cat], i) => `<div class="card" style="padding:0;overflow:hidden">${art(i, 150, "border-radius:0")}<div style="padding:16px">
<span class="chip">${cat}</span><h3 style="margin-top:10px">${t}</h3><p class="small muted" style="margin-top:4px">${who} · ${n} materi · ${lvl}</p>
<div class="row between" style="margin-top:12px"><span class="small">${stars(5)} 4,${8 - (i % 3)}</span><span class="price">${rp(price)}</span></div></div></div>`;

const shell = (ctx, on, main) =>
  topnav(ctx.brand, NAV, on, `<a class="btn ghost sm hide-m">Masuk</a><a class="btn sm">Daftar</a>`) +
  main +
  footer(ctx, [
    ["Belajar", ["Semua kursus", "Jalur karier", "Kelas langsung"]],
    ["Mengajar", ["Jadi pengajar", "Panduan materi", "Komunitas"]],
    ["Bantuan", ["Pertanyaan umum", "Sertifikat kelulusan", "Hubungi kami"]],
  ]);

export function build(ctx) {
  return {
    home: shell(ctx, "Beranda", `<section class="hero"><div class="wrap sec hgrid" style="min-height:460px">
<div><span class="chip">Lebih dari 240 kursus berbahasa Indonesia</span><h1 style="margin-top:14px">${ctx.tagline}</h1>
<p class="muted" style="margin-top:14px;max-width:500px">Video singkat, latihan langsung, dan mentor yang membalas pertanyaan Anda. Belajar dari ponsel atau laptop, kapan saja.</p>
<div class="row" style="margin-top:24px"><a class="btn">Jelajahi kursus</a><a class="btn ghost" style="color:inherit">Coba kelas gratis</a></div>
<div class="row" style="margin-top:26px;gap:28px">${[["86.000+", "siswa aktif"], ["4,8", "rata-rata ulasan"], ["120", "pengajar"]].map(([k, l]) => `<div><b style="font-size:22px">${k}</b><p class="small muted">${l}</p></div>`).join("")}</div></div>
<div class="hide-m">${art(3, 360)}</div></div></section>
<section class="sec"><div class="wrap"><div class="row between"><h2>Kursus populer</h2><a class="small" style="color:var(--accent);font-weight:600">Lihat semua kursus</a></div>
<div class="grid g3" style="margin-top:18px">${COURSES.slice(0, 3).map(courseCard).join("")}</div></div></section>`),
    courses: shell(ctx, "Kursus", `<main class="sec"><div class="wrap"><h1 style="font-size:38px">Katalog kursus</h1><p class="muted" style="margin-top:6px">Pilih dari 240 kursus dalam 8 bidang.</p>
<div class="row wrapr" style="margin-top:18px">${["Semua", "Desain", "Data", "Pemrograman", "Bisnis", "Kreatif"].map((c, i) => `<span class="chip${i === 0 ? " on" : ""}">${c}</span>`).join("")}</div>
<div class="grid g3" style="margin-top:22px">${COURSES.map(courseCard).join("")}</div></div></main>`),
    course: shell(ctx, "Kursus", `<section class="hero"><div class="wrap sec"><p class="small muted">Kursus / Data</p><h1 style="margin-top:10px;font-size:40px;max-width:760px">Analisis Data dengan Python</h1>
<p class="muted" style="margin-top:10px;max-width:640px">Olah data penjualan sungguhan dengan pandas, buat grafik yang mudah dibaca, dan sajikan temuan untuk tim Anda.</p>
<p class="small" style="margin-top:12px">${stars(5)} 4,9 (2.180 ulasan) · 18.900 siswa · Pengajar: Bayu Santoso</p></div></section>
<main class="sec"><div class="wrap side"><div><h2>Yang akan Anda pelajari</h2><div class="grid g2" style="margin-top:14px">${["Membersihkan data yang berantakan", "Menggabungkan beberapa tabel", "Membuat grafik tren penjualan", "Menyusun laporan mingguan otomatis"].map((x) => `<p class="card small">✓ ${x}</p>`).join("")}</div>
<h2 style="margin-top:30px">Silabus</h2>${[["Modul 1 · Mengenal pandas", "6 materi · 48 menit"], ["Modul 2 · Membersihkan data", "8 materi · 1 jam 10 menit"], ["Modul 3 · Visualisasi", "7 materi · 55 menit"], ["Modul 4 · Proyek akhir", "4 materi · 1 jam"]].map(([m, d]) => `<div class="card row between" style="margin-top:10px"><b>${m}</b><span class="small muted">${d}</span></div>`).join("")}</div>
<div class="card">${art(2, 180)}<p class="price" style="font-size:28px;margin-top:16px">${rp(349000)}</p><a class="btn block" style="margin-top:14px">Daftar kursus</a><a class="btn ghost block" style="margin-top:10px">Coba materi gratis</a>
<p class="small muted" style="margin-top:14px">Akses seumur hidup · 36 materi · Sertifikat kelulusan · Forum diskusi</p></div></div></main>`),
    lesson: `<div class="lside" style="grid-template-columns:300px minmax(0,1fr);gap:0"><aside class="sidebar hide-m"><a class="brand" style="padding:0 0 16px"><span class="logo"></span>${ctx.brand}</a>
<p class="label">Analisis Data dengan Python</p><div class="bar" style="margin:10px 0 16px"><i style="width:42%"></i></div>
${["1.1 Memasang Python", "1.2 Membaca berkas CSV", "1.3 Mengenal DataFrame", "2.1 Data yang hilang", "2.2 Menghapus duplikat", "2.3 Mengubah tipe kolom", "3.1 Grafik garis", "3.2 Grafik batang"].map((l, i) => `<a class="${i === 4 ? "on" : ""}">${l}</a>`).join("")}</aside>
<main style="padding:28px 40px"><p class="small muted">Modul 2 · Membersihkan data</p><h1 style="font-size:32px;margin-top:6px">2.2 Menghapus duplikat</h1>
<div class="art v1" style="height:420px;margin-top:18px;display:grid;place-items:center"><span style="width:84px;height:84px;border-radius:50%;background:var(--surface);opacity:.9;display:grid;place-items:center;font-size:30px;color:var(--accent)">▶</span></div>
<div class="row between" style="margin-top:16px"><a class="btn ghost sm">← Materi sebelumnya</a><a class="btn sm">Tandai selesai & lanjut</a></div>
<div class="grid g2" style="margin-top:20px"><div class="card"><h3>Catatan materi</h3><p class="muted small" style="margin-top:6px">Baris ganda sering muncul saat data digabung dari beberapa cabang toko. Gunakan drop_duplicates dengan kolom kunci yang tepat agar data asli tidak ikut terhapus.</p></div>
<div class="card"><h3>Diskusi (24)</h3><p class="small" style="margin-top:6px"><b>Putri R.</b> · Bagaimana jika kolom tanggal formatnya berbeda?</p><p class="small muted" style="margin-top:6px"><b>Bayu Santoso</b> · Samakan dulu formatnya dengan to_datetime, lalu hapus duplikat.</p></div></div></main></div>`,
    instructors: shell(ctx, "Pengajar", `<main class="sec"><div class="wrap"><h1 style="font-size:38px">Pengajar kami</h1><p class="muted" style="margin-top:6px;max-width:620px">Praktisi yang mengajar dari pengalaman kerja nyata, bukan sekadar teori.</p>
<div class="grid g4 keep-m" style="margin-top:24px">${TEACHERS.map(([n, r, s]) => `<div class="card" style="text-align:center"><span class="avatar lg" style="display:block;margin:0 auto"></span><h3 style="margin-top:14px">${n}</h3><p class="small muted">${r}</p><p class="small" style="margin-top:8px">${s}</p><a class="btn ghost sm" style="margin-top:12px">Lihat profil</a></div>`).join("")}</div>
<div class="card hgrid" style="margin-top:28px"><div><h2>Ingin mengajar di ${ctx.brand}?</h2><p class="muted" style="margin-top:8px">Bagikan keahlian Anda dan dapatkan bagi hasil dari setiap pendaftaran kursus.</p></div><div style="text-align:right"><a class="btn">Daftar jadi pengajar</a></div></div></div></main>`),
    login: shell(ctx, "Beranda", loginPage(ctx, { lead: "Lanjutkan kursus dari materi terakhir Anda.", side: `${art(0, 420)}<h2 style="margin-top:20px">Belajar sedikit setiap hari.</h2><p class="muted" style="margin-top:8px">Rata-rata siswa menyelesaikan satu kursus dalam tiga minggu.</p>` })),
  };
}
