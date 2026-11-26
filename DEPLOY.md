# Deploy Saksi (Proxmox + Docker)

Panduan men-deploy Saksi secara publik memakai Docker Compose: **Caddy
(HTTPS) + Next.js app + PostgreSQL**. Hanya Caddy yang terekspos (port 80/443);
app dan database tetap di jaringan internal.

> Untuk instance publik, fitur **Run & Security Scan** dinonaktifkan
> (`RUNNER_MODE=disabled`) karena membutuhkan Docker daemon host. Aktifkan hanya
> di instance tepercaya/single-user.

## Arsitektur

```
Internet
  │
  ├─ Jalur A: DNS A → IP publik/NAT
  └─ Jalur B: Cloudflare Tunnel (tanpa buka port)
        │
Proxmox host
  │
VM Debian/Ubuntu
  │
docker compose -f docker-compose.prod.yml
  - caddy   (80/443, HTTPS otomatis)
  - app     (internal :3000)
  - db      (internal :5432, volume persisten)
```

## 1. Buat VM di Proxmox

- Debian 12 atau Ubuntu 22.04+, 2 vCPU, RAM 2–4 GB, disk 20–40 GB.
- Beri IP: bridged publik (Jalur A) atau privat + gateway (Jalur B).

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER" && newgrp docker
```

## 3. Ambil kode

```bash
git clone <url-repo> shieldforge && cd shieldforge
```

Direktori clone sengaja tetap `shieldforge`: Docker Compose memakai nama direktori sebagai awalan volume (`shieldforge_shieldforge-db`), sehingga clone ke direktori lain membuat volume Postgres baru yang kosong.

## 4. Konfigurasi `.env`

```bash
cp .env.example .env
```

Isi nilai produksi:

| Variabel | Nilai |
|---|---|
| `DOMAIN` | domain publik, mis. `saksi.example.com` |
| `AUTH_URL` / `NEXTAUTH_URL` | `https://saksi.example.com` |
| `POSTGRES_PASSWORD` | kata sandi kuat (untuk container `db`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_MASTER_KEY` | `openssl rand -hex 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | kredensial GitHub OAuth |
| `RUNNER_MODE` | `disabled` (biarkan) |

`DATABASE_URL` untuk compose di-set otomatis ke host `db` (lihat
`docker-compose.prod.yml`).

## 5a. Jalur A — DNS ke IP publik

1. Minta admin memetakan IP publik/NAT (80 & 443) ke VM.
2. Tambah DNS record `A` untuk `DOMAIN` → IP publik.
3. Caddy akan menerbitkan sertifikat Let's Encrypt otomatis.

## 5b. Jalur B — Cloudflare Tunnel (tanpa IP publik)

```bash
# Di VM, arahkan tunnel ke app internal:
cloudflared tunnel login
cloudflared tunnel create saksi
# Konfigurasi CNAME domain → <tunnel-id>.cfargotunnel.com, lalu:
cloudflared tunnel route dns saksi saksi.example.com
cloudflared tunnel run --url http://localhost:3000 saksi
```

Dengan jalur ini Caddy bisa dilewati (Cloudflare menangani TLS di edge); jalankan
hanya service `db` dan `app`:

```bash
docker compose -f docker-compose.prod.yml up -d db app
```

## 6. Nyalakan stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Container `app` otomatis menjalankan `prisma migrate deploy` + seed master data
sebelum start.

## 7. GitHub OAuth

Buat OAuth App di GitHub → **Authorization callback URL**:
`https://<DOMAIN>/api/auth/callback/github`, lalu isi `AUTH_GITHUB_ID` &
`AUTH_GITHUB_SECRET` di `.env` dan `docker compose ... up -d app`.

> Jika `NODE_ENV=production` dan GitHub OAuth belum diisi, aplikasi membalas 503
> dengan pesan jelas (lihat `src/proxy.ts`).

## Verifikasi

```bash
curl -fsS https://<DOMAIN>/api/health   # {"status":"ok",...}
```

Buka `https://<DOMAIN>` → login. Untuk multi-user publik, tiap pengguna menambah
API key sendiri (BYOK) di Settings; kosongkan `DEFAULT_AI_*` agar kuota Anda tidak
terpakai bersama.

## Backup & restore

```bash
# Backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U postgres secure_sdlc | gzip > backup-$(date +%F).sql.gz

# Restore
gunzip -c backup-YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U postgres secure_sdlc
```

## Operasional

- **Rate limiter** in-memory (aman untuk satu instance). Untuk multi-instance,
  pindahkan bucket ke Redis.
- **Firewall**: hanya 80/443 terbuka; 3000 & 5432 tidak diekspos.
- **Log**: `docker compose -f docker-compose.prod.yml logs -f app caddy`.
- **Update**: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
