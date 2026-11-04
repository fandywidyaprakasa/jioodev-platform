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

## Deploy (Coolify)

Production memakai repo artifact **`fandywidyaprakasa/jioodev-platform`** (Nixpacks,
base directory `/`). Repo itu berisi `app/` di root + `library/{templates,sections,
compositions,themes}`. Jangan edit repo itu manual.

Alur dari monorepo:

```bash
node scripts/sync-platform.mjs --dry-run   # cek rencana
node scripts/sync-platform.mjs             # sync + commit + push
```

Lalu redeploy `jioodev-platform-app` di Coolify. Environment produksi minimal:
`POCKETBASE_PLATFORM_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`,
`MASTER_HUB_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JIOODEV_AUTH_MODE=real`,
`NEXT_PUBLIC_API_MODE=real`, `JIOODEV_LIBRARY_DIR=/app/library`.

Cek `https://app.jioo.site/api/health` → `ok:true`. Jalankan
`scripts/apply-pb-schema.mjs` setelah ada perubahan schema.

**Docker (opsional, self-host):** `Dockerfile` di root monorepo membangun image
standalone dengan `library/` di `/library` dan healthcheck `GET /api/health`.

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
