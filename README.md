# JiooDev Platform (Next.js)

Scaffold Phase 1 (T-010).

## Jalankan

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build

# Demo tanpa backend (mock auth + mock API)
# JIOODEV_AUTH_MODE=mock NEXT_PUBLIC_API_MODE=mock pnpm dev
```

## Struktur

```
app/
├── src/app/            # App Router (layout, page, api)
├── src/styles/         # tokens.css (salinan dari design/tokens.css)
├── tailwind.config.ts  # membaca design/tokens.json
└── .env.example
```

## Catatan

- **Design tokens**: sumber `design/tokens.json`; `tokens.css` disalin ke
  `src/styles/` (jalankan `bash scripts/sync-tokens.sh` setelah mengubah token).
- No glassmorphism; mobile-first; DOM semantik (Spec 09).
- Health: `GET /api/health`.

## Verifikasi

```bash
pnpm typecheck
pnpm lint
pnpm test          # unit (Vitest)
pnpm test:e2e      # Playwright; install browser sekali: pnpm exec playwright install chromium
pnpm build
```

## Environment

Salin `.env.example` → `.env.local`. Variabel penting:

- `POCKETBASE_PLATFORM_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`
- `MASTER_HUB_URL`, `MASTER_HUB_TOKEN` (fallback: `POCKETBASE_MASTER_URL`, `POCKETBASE_SERVICE_TOKEN`)
- `JIOODEV_LIBRARY_DIR` (default `../library`) untuk preview HTML
- `QRIS_API_URL` + `QRIS_API_KEY` (kosong = pembayaran manual diverifikasi admin)
- `COOLIFY_DEPLOY_WEBHOOK`, `DEPLOY_HEALTH_URL`, `DOMAIN_CNAME_TARGET`
- `HERMES_JOB_URL`, `HERMES_API_TOKEN`, `HERMES_CALLBACK_SECRET`
- `RESEND_API_KEY`, `NOTIFY_FROM`

Tanpa kredensial eksternal, platform tetap berjalan dengan fallback:
variasi lokal (Hermes), QRIS manual, deploy semi-manual, dan katalog template mock 18.

## Deploy (Coolify / Docker)

Deploy dari **root repo** (bukan `app/`) memakai `Dockerfile` di root, supaya folder
`library/` ikut ke dalam image. Image menjalankan Next.js standalone di port 3000
dengan `JIOODEV_LIBRARY_DIR=/library` dan healthcheck `GET /api/health`.

1. Coolify → **New Resource → Dockerfile**, repository root, Dockerfile `/Dockerfile`.
2. Persistent volume untuk PocketBase (resource terpisah, lihat `pocketbase-platform/`).
3. Isi environment produksi (lihat `.env.example`); minimal:
   `POCKETBASE_PLATFORM_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`,
   `MASTER_HUB_URL`, `MASTER_HUB_TOKEN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
   `PREVIEW_TOKEN_SECRET`, `JIOODEV_AUTH_MODE=real`, `NEXT_PUBLIC_API_MODE=real`.
4. Deploy, lalu cek `https://<domain>/api/health` (`pocketbase=ok`).
5. Jalankan `scripts/apply-pb-schema.mjs` + `scripts/seed-platform.mjs` ke PocketBase.

Tanpa Docker (Nixpacks), set base directory ke root repo dan tambahkan
`JIOODEV_LIBRARY_DIR=<path repo>/library`; jika base directory `app/`, folder
`library/` tidak tersedia saat runtime dan preview template akan gagal.

## Worker & backup

```bash
node ../scripts/notification-worker.mjs   # digest email (cron 5–15 menit)
node ../scripts/backup-pocketbase.mjs     # backup PocketBase
node ../scripts/restore-pocketbase.mjs --dry-run   # pilih backup terbaru
RESTORE_CONFIRM=1 node ../scripts/restore-pocketbase.mjs <nama-backup>
```

Worker memakai `RESEND_API_KEY` untuk email digest. Pengiriman WhatsApp belum
diaktifkan karena gateway belum ditentukan.

## Preview

`/preview/<token>` merender template HTML statis + context/copy project,
`noindex`, dan aset diproksi lewat route internal. Token diturunkan dari
`production_outputs` (tidak dapat ditebak).
