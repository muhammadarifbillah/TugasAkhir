# Rencana Deploy — ShieldForge (Proxmox)

> Status: **DRAFT / DITUNDA**. Dokumen ini rencana; belum ada perubahan kode deploy
> yang diterapkan. Centang keputusan di Bagian 6 sebelum eksekusi.

## 1. Konteks

- Hypervisor: **Proxmox VE** pada host `isabelputi`.
- VM contoh yang sudah ada: `100 LLMSecureBox`, `101 fauzia`, `102 siem-hosting`,
  `103 yogi-secops` (IP privat `10.252.242.2/24`, gateway `10.252.242.1`).
- Karena VM 103 sudah dipakai, deploy ShieldForge memakai **VM baru** (mis. `104`).
- IP VM contoh masih **privat (10.x)**. Akses publik menyesuaikan kondisi jaringan
  (lihat Bagian 3).

## 2. Arsitektur

```
Internet
  │
  ├─ Jalur A: DNS A → IP publik/NAT
  └─ Jalur B: Cloudflare Tunnel (tanpa buka port)
        │
Proxmox host "isabelputi"
        │
VM BARU (Debian 12, 2–4 GB RAM, disk 20–40 GB)
        │
Docker Compose:
  - caddy   (HTTPS + pintu masuk; port 80/443)
  - app     (ShieldForge; internal 3000)
  - db      (PostgreSQL 16; internal 5432)
```

## 3. Dua jalur akses publik

### Jalur A — Ada IP publik / NAT
1. Minta admin jaringan memetakan IP publik (atau NAT 80/443) ke VM.
2. Tambah DNS record `A` domain → IP publik tersebut.
3. Caddy menerbitkan sertifikat HTTPS otomatis (Let's Encrypt).

### Jalur B — Hanya IP privat
1. Pakai **Cloudflare Tunnel** (`cloudflared`) di dalam VM.
2. Hubungkan tunnel ke domain di Cloudflare; **tanpa** membuka port masuk.
3. Caddy tetap dipakai untuk routing internal + HTTPS (atau Cloudflare menangani TLS di edge).

## 4. Langkah manual di Proxmox (dilakukan operator)

1. Buat VM baru (mis. 104): Debian 12, 2–4 GB RAM, 2 vCPU, disk 20–40 GB.
2. Beri IP (bridged privat, atau publik bila tersedia) + gateway + DNS.
3. `apt install docker.io docker-compose-plugin` (atau repo resmi Docker).
4. Clone repository ShieldForge ke VM.
5. Salin `.env.example` → `.env` lalu isi nilai produksi (Bagian 5).
6. `docker compose -f docker-compose.prod.yml up -d --build`.
7. Verifikasi: `https://<domain>` membuka halaman login.

## 5. Konfigurasi produksi (env)

| Variabel | Nilai produksi |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:<password-kuat>@db:5432/secure_sdlc?schema=public` |
| `AUTH_URL` / `NEXTAUTH_URL` | `https://<domain>` |
| `AUTH_TRUST_HOST` | `true` (wajib di belakang reverse proxy) |
| `AUTH_SECRET` | string acak panjang (`openssl rand -base64 32`) |
| `ENCRYPTION_MASTER_KEY` | hex 32 byte (`openssl rand -hex 32`) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | kredensial GitHub OAuth |
| GitHub OAuth callback | `https://<domain>/api/auth/callback/github` |
| `TRUSTED_PROXY` | `1` (agar IP asli dari `x-forwarded-for` dipakai untuk rate limit & audit) |
| `RUNNER_MODE` | `disabled` untuk publik (lihat Bagian 6) |

## 6. Keputusan yang masih tertunda

1. **Domain**: sudah ada, atau pakai placeholder `shieldforge.<domain>`?
2. **Akses VM**: dapat **IP publik/NAT** (Jalur A) atau **hanya privat** (Jalur B)?
3. **Run & Security Scan** di instance publik:
   - `RUNNER_MODE=disabled` — **aman** (rekomendasi); fitur didemokan di VM terpisah, **tanpa** `docker.sock`.
   - Aktifkan dengan mount `/var/run/docker.sock` — di VM terisolasi risikonya terbatas ke VM itu, tetapi tetap tidak dianjurkan untuk publik.
4. **Registrasi email**: dibuka untuk publik, atau **hanya GitHub OAuth** (lebih aman)?

## 7. Perubahan kode yang menyusul (P5b)

- `Caddyfile` + service `caddy` di `docker-compose.prod.yml`; hanya 80/443 diekspos; `app` & `db` internal.
- Service opsional `cloudflared` untuk Jalur B.
- Endpoint `/api/health` + healthcheck service `app`.
- `docker-compose.prod.yml` terpisah dari `docker-compose.yml` pengembangan.

## 8. Operasional

- **Backup**: `pg_dump` berkala dari container `db` (dan uji restore).
- **Rate limiter**: masih in-memory → aman untuk **satu instance**; pindah ke Redis bila multi-instance.
- **Firewall**: hanya 80/443 terbuka; 3000 & 5432 tidak diekspos.
- **Migrasi & seed**: container `app` menjalankan `prisma migrate deploy` + seed idempoten saat start.
- **Log**: pantau container `app` & `caddy`; pertimbangkan rotasi log.
