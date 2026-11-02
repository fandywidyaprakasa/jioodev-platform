# JSDEV Platform (Next.js)

Scaffold Phase 1 (T-010).

## Jalankan

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
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
