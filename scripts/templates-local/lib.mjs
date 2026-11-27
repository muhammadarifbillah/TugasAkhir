// Shared building blocks for the FUSE example templates: themes, base CSS, navigation, footer, CSS illustrations.
// Every page is static HTML with no external images or fonts; illustrations are CSS gradients and shapes.

const PALETTE_CLEAN = {
  bg: "#F6FAFD", surface: "#FFFFFF", ink: "#0A1931", muted: "#3D5878", accent: "#1A3D63", accentInk: "#F6FAFD",
  line: "#B3CFE5", soft: "#E4EEF6", hero: "linear-gradient(160deg,#F6FAFD 0%,#DCE9F4 55%,#B3CFE5 100%)", heroInk: "#0A1931",
  art: ["#1A3D63", "#4A7FA7", "#B3CFE5", "#0A1931"],
};
const PALETTE_DARK = {
  bg: "#0A1931", surface: "#11274A", ink: "#F6FAFD", muted: "#B3CFE5", accent: "#B3CFE5", accentInk: "#0A1931",
  line: "#25456F", soft: "#163257", hero: "linear-gradient(160deg,#1A3D63 0%,#0A1931 100%)", heroInk: "#F6FAFD",
  art: ["#4A7FA7", "#B3CFE5", "#1A3D63", "#F6FAFD"],
};

/** Hero mood colours of the first template per category (they match the FUSE hero). */
const MOOD = {
  marketplace: { bg: "#F1F7EC", ink: "#16301C", muted: "#4F6B55", accent: "#2E7D3A", line: "#CFE3C6", soft: "#E1F0D6",
    hero: "linear-gradient(165deg,#CDE9B0 0%,#7DB957 45%,#2E6B33 100%)", heroInk: "#FFFFFF", art: ["#2E7D3A", "#8BC46A", "#E9D77A", "#5E9E4A"] },
  ecommerce: { bg: "#EEF5FA", ink: "#0B2A40", muted: "#4A6478", accent: "#0E5E8E", line: "#C6DCEA", soft: "#DCEBF5",
    hero: "linear-gradient(170deg,#A6D8F0 0%,#2F86B8 50%,#0B3D63 100%)", heroInk: "#FFFFFF", art: ["#0E5E8E", "#5FB0DA", "#F2D9A4", "#0B3D63"] },
  lms: { bg: "#FAFDFE", ink: "#12313A", muted: "#557079", accent: "#2B7488", line: "#D5E8EC", soft: "#EAF5F7",
    hero: "repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 14px,rgba(255,255,255,0) 14px 40px),linear-gradient(180deg,#FFFFFF 0%,#E3F2F5 45%,#AFD6DF 100%)",
    heroInk: "#12313A", art: ["#2B7488", "#8CC7D3", "#DDEFF2", "#5C9AA8"] },
  saas: { bg: "#FFF6EF", ink: "#2A1A12", muted: "#7A5A48", accent: "#D9622B", line: "#F1D6C4", soft: "#FCE6D6",
    hero: "linear-gradient(160deg,#FFC46B 0%,#F08A3C 45%,#9C3A1E 100%)", heroInk: "#FFFFFF", art: ["#D9622B", "#F6A65A", "#FFD9A0", "#9C3A1E"] },
  clinic: { bg: "#EAF3F6", ink: "#062636", muted: "#44606C", accent: "#0F6E84", line: "#C3DDE4", soft: "#D6EAF0",
    hero: "linear-gradient(170deg,#1C7C93 0%,#0B4A63 50%,#04202F 100%)", heroInk: "#FFFFFF", art: ["#0F6E84", "#57B3C6", "#BFE4EC", "#063A4E"] },
  company: { bg: "#FBF2EC", ink: "#2E140D", muted: "#7A4B3C", accent: "#B23A22", line: "#EED3C6", soft: "#F7E0D3",
    hero: "linear-gradient(165deg,#F2B36B 0%,#D0632F 45%,#7E2414 100%)", heroInk: "#FFFFFF", art: ["#B23A22", "#E58A4E", "#F3CF94", "#6E2A1A"] },
  news: { bg: "#F7F2FA", ink: "#23133A", muted: "#64507A", accent: "#6A3FA0", line: "#E1D3EC", soft: "#ECE0F4",
    hero: "linear-gradient(160deg,#F6B7C6 0%,#B27ACB 45%,#3E2470 100%)", heroInk: "#FFFFFF", art: ["#6A3FA0", "#D98FB0", "#F3C9D6", "#3E2470"] },
  api: { bg: "#FBFDFF", ink: "#10233A", muted: "#50657D", accent: "#3769A3", line: "#DCE7F2", soft: "#EEF4FA",
    hero: "linear-gradient(180deg,#FFFFFF 0%,#E8F1FA 55%,#C9DCEF 100%)", heroInk: "#10233A", art: ["#3769A3", "#9DBEE0", "#E3EDF7", "#1D3F66"] },
};

export const VARIANTS = ["mood", "clean", "dark"];

export function themeFor(category, variant) {
  if (variant === "clean") return PALETTE_CLEAN;
  if (variant === "dark") return PALETTE_DARK;
  return { surface: "#FFFFFF", accentInk: "#FFFFFF", ...MOOD[category] };
}

export const rp = (n) => `Rp ${n.toLocaleString("id-ID")}`;

function css(t, variant) {
  const serif = variant === "dark";
  const r = variant === "dark" ? "3px" : variant === "clean" ? "10px" : "16px";
  return `
:root{--bg:${t.bg};--surface:${t.surface};--ink:${t.ink};--muted:${t.muted};--accent:${t.accent};--accent-ink:${t.accentInk};
--line:${t.line};--soft:${t.soft};--hero:${t.hero};--hero-ink:${t.heroInk};--a0:${t.art[0]};--a1:${t.art[1]};--a2:${t.art[2]};--a3:${t.art[3]};--r:${r}}
*{box-sizing:border-box;margin:0;padding:0}
html{scrollbar-width:none}::-webkit-scrollbar{display:none}
body{background:var(--bg);color:var(--ink);font:15px/1.55 "Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:${serif ? 'Georgia,"Times New Roman",serif' : '"Segoe UI",system-ui,sans-serif'};font-weight:${serif ? 600 : 700};line-height:1.15;letter-spacing:${serif ? "0" : "-.01em"}}
h1{font-size:46px}h2{font-size:28px}h3{font-size:18px}h4{font-size:15px}
a{color:inherit;text-decoration:none}
.wrap{max-width:1240px;margin:0 auto;padding:0 40px}
.muted{color:var(--muted)}.small{font-size:13px}.tiny{font-size:12px}
.label{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.row{display:flex;align-items:center;gap:12px}.between{justify-content:space-between}.wrapr{flex-wrap:wrap}
.stack>*+*{margin-top:12px}
.grid{display:grid;gap:22px}.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.side{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:32px;align-items:start}
.lside{display:grid;grid-template-columns:240px minmax(0,1fr);gap:32px;align-items:start}
.nav{background:var(--surface);border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;align-items:center;gap:28px;height:68px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:19px;white-space:nowrap}
.logo{width:30px;height:30px;border-radius:${variant === "dark" ? "2px" : "9px"};background:linear-gradient(135deg,var(--a0),var(--a1));position:relative}
.logo:after{content:"";position:absolute;inset:8px;border-radius:50%;background:var(--surface);opacity:.85}
.links{display:flex;gap:22px;font-size:14px;color:var(--muted);flex:1}
.links a.on{color:var(--ink);font-weight:600;box-shadow:inset 0 -2px 0 var(--accent);padding-bottom:4px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 20px;border-radius:${variant === "dark" ? "2px" : "999px"};background:var(--accent);color:var(--accent-ink);font-weight:600;font-size:14px;white-space:nowrap;border:1px solid var(--accent)}
.btn.ghost{background:transparent;color:var(--ink);border-color:var(--line)}
.btn.block{width:100%}.btn.sm{height:34px;padding:0 14px;font-size:13px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px}
.chip{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;background:var(--soft);color:var(--ink);font-size:12px;font-weight:600;white-space:nowrap}
.chip.on{background:var(--accent);color:var(--accent-ink)}
.hero{background:var(--hero);color:var(--hero-ink)}
.hero .muted{color:var(--hero-ink);opacity:.82}
.sec{padding-top:44px;padding-bottom:44px}.sec.tight{padding-top:28px;padding-bottom:28px}
.hgrid{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}
.art{position:relative;overflow:hidden;border-radius:var(--r);background:linear-gradient(135deg,var(--a2),var(--a1));min-height:120px}
.art.v1{background:linear-gradient(160deg,var(--a1),var(--a0))}.art.v2{background:linear-gradient(120deg,var(--a2),var(--a3))}
.art.v3{background:radial-gradient(circle at 30% 30%,var(--a2),var(--a1) 60%,var(--a0))}
.art i{position:absolute;border-radius:50%;background:var(--surface);opacity:.35}
.art b{position:absolute;border-radius:var(--r);background:var(--a3);opacity:.55}
.price{font-weight:700;font-size:17px}.strike{text-decoration:line-through;color:var(--muted);font-size:13px;margin-left:6px}
.stars{color:#E0A526;letter-spacing:2px;font-size:13px}
.field{display:block;margin-top:14px}.field span{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
.input{height:44px;border:1px solid var(--line);border-radius:${variant === "dark" ? "2px" : "10px"};background:var(--surface);padding:0 14px;display:flex;align-items:center;color:var(--muted);font-size:14px}
.input.area{height:96px;align-items:flex-start;padding-top:12px}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
th,td{padding:12px 10px;border-bottom:1px solid var(--line)}
.bar{height:8px;border-radius:99px;background:var(--soft);overflow:hidden}.bar>i{display:block;height:100%;background:var(--accent)}
.avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--a1),var(--a0));flex:none}
.avatar.lg{width:120px;height:120px}.avatar.xl{width:180px;height:180px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block}
.foot{border-top:1px solid var(--line);background:var(--surface);margin-top:40px}
.foot .wrap{padding-top:36px;padding-bottom:30px}
.foot .cols{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:28px}
.foot h4{margin-bottom:10px}.foot p,.foot li{font-size:13px;color:var(--muted);list-style:none;line-height:1.9}
.rule{border:0;border-top:1px solid var(--line);margin:18px 0}
.code{background:#0A1931;color:#DCE9F4;border-radius:var(--r);padding:18px 20px;font:13px/1.7 Consolas,"Cascadia Mono",monospace;white-space:pre;overflow:hidden}
.code .k{color:#9CC7EA}.code .s{color:#F2C98B}.code .c{color:#7E95AE}
.mth{display:inline-block;min-width:54px;text-align:center;font:700 11px/22px Consolas,monospace;border-radius:4px;color:#fff;background:#2F7D5B}
.mth.post{background:#2E64A8}.mth.del{background:#B0413E}.mth.put{background:#A8742E}
.sidebar{background:var(--surface);border-right:1px solid var(--line);min-height:100vh;padding:22px 18px}
.sidebar a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-size:14px;color:var(--muted)}
.sidebar a.on{background:var(--soft);color:var(--ink);font-weight:600}
.sidebar a:before{content:"";width:14px;height:14px;border-radius:4px;border:2px solid currentColor;opacity:.6}
.kpi{font-size:30px;font-weight:700;margin-top:6px}
.up{color:#2F7D5B;font-weight:600;font-size:13px}.down{color:#B0413E;font-weight:600;font-size:13px}
.tag{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;background:var(--soft)}
.ok{background:#DDF1E6;color:#1E5E3F}.warn{background:#FBEBD3;color:#7A4C12}.bad{background:#F6DADA;color:#7A2321}
.dark-only{display:${variant === "dark" ? "block" : "none"}}
${variant === "dark" ? ".card{background:var(--surface)}.hero h1{font-style:italic}.nav{border-bottom:1px solid var(--line)}" : ""}
@media (max-width:760px){
  .wrap{padding:0 18px}h1{font-size:32px}h2{font-size:22px}
  .links,.hide-m{display:none!important}
  .g2,.g3,.g4,.side,.lside,.hgrid,.foot .cols{grid-template-columns:minmax(0,1fr)}
  .g4.keep-m,.g3.keep-m{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sec{padding-top:28px;padding-bottom:28px}.nav .wrap{gap:12px}
}`;
}

/** Full HTML document. */
export function doc({ title, category, variant, body }) {
  const t = themeFor(category, variant);
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${css(t, variant)}</style></head><body>${body}</body></html>`;
}

/** Top navigation bar. `links` are labels, `on` the active one; `right` extra HTML on the right. */
export function topnav(brand, links, on, right = "") {
  return `<header class="nav"><div class="wrap"><a class="brand"><span class="logo"></span>${brand}</a>
<nav class="links">${links.map((l) => `<a class="${l === on ? "on" : ""}">${l}</a>`).join("")}</nav>${right}</div></header>`;
}

export function footer(ctx, cols) {
  return `<footer class="foot"><div class="wrap"><div class="cols">
<div><a class="brand"><span class="logo"></span>${ctx.brand}</a><p style="margin-top:10px;max-width:300px">${ctx.tagline}</p>
<p style="margin-top:10px">Jl. Jenderal Sudirman Kav. 21, Jakarta Selatan 12920<br>halo@${ctx.slug}.id · (021) 5790 1234</p></div>
${cols.map(([h, items]) => `<div><h4>${h}</h4><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`).join("")}
</div><hr class="rule"><p class="tiny muted">© 2026 ${ctx.brand}. Contoh template buatan FUSE · Jakarta, Indonesia</p></div></footer>`;
}

/** CSS-only illustration: a gradient block with a few soft shapes; `seed` varies the composition. */
export function art(seed, h = 180, extra = "") {
  const v = ["", "v1", "v2", "v3"][seed % 4];
  const s = (seed * 37) % 100;
  return `<div class="art ${v}" style="height:${h}px;${extra}"><i style="width:${40 + (s % 30)}%;aspect-ratio:1;left:${(s * 3) % 60}%;top:${(s * 7) % 50}%"></i>
<b style="width:${22 + (s % 18)}%;height:${18 + (s % 20)}%;right:${8 + (s % 20)}%;bottom:${10 + (s % 15)}%"></b><i style="width:14%;aspect-ratio:1;right:10%;top:12%;opacity:.5"></i></div>`;
}

export const stars = (n = 5) => `<span class="stars">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`;

export const field = (label, value, area = false) =>
  `<label class="field"><span>${label}</span><div class="input${area ? " area" : ""}">${value}</div></label>`;

/** Centered sign-in card used by every category's login page. */
export function loginPage(ctx, { lead, side }) {
  return `<main class="sec"><div class="wrap"><div class="grid g2" style="align-items:center;min-height:640px">
<div class="hide-m">${side}</div>
<div class="card" style="max-width:440px;width:100%;margin:0 auto;padding:34px">
<a class="brand"><span class="logo"></span>${ctx.brand}</a>
<h2 style="margin-top:22px">Masuk ke akun Anda</h2><p class="muted" style="margin-top:6px">${lead}</p>
${field("Email", `nama@contoh.id`)}${field("Kata sandi", "••••••••••")}
<div class="row between small" style="margin-top:14px"><span class="row"><span class="input" style="width:18px;height:18px;padding:0"></span>Ingat saya</span><a style="color:var(--accent);font-weight:600">Lupa kata sandi?</a></div>
<a class="btn block" style="margin-top:20px">Masuk</a>
<p class="small muted" style="margin-top:16px;text-align:center">Belum punya akun? <a style="color:var(--accent);font-weight:600">Daftar gratis</a></p>
</div></div></div></main>`;
}
