# LAND-LSPLIT-EDT-001

Template referensi hasil rebuild manual.

- **Sumber:** Ditto (`lzkgiu3nqedtd66`)
- **Layout:** L-SPLIT (hero terbelah)
- **Style:** Editorial + Warm
- **Sections:** Hero → Features → CTA/Offer → Footer
- **Format:** HTML statis (tanpa framework)

## Struktur

```
index.html
assets/style.css   (design tokens + layout)
assets/script.js   (hydration + tahun)
assets/hero.svg    (ilustrasi)
meta.json          (metadata katalog)
```

## Data binding (untuk JS Panel)

Elemen memakai `data-bind`:
`business_name, header_cta, hero_eyebrow, hero_title, hero_subtitle, hero_cta, features_title, features_lead, offer_title, offer_text, offer_cta, footer_text, year`.

Hydrate via `window.JiooDev_DATA = { hero_title: "..." }` atau API.

## Catatan
- Form masih placeholder (terhubung PocketBase saat deploy).
- Font: Fraunces (display) + DM Sans (body) — bukan font slop.
- Responsif + `prefers-reduced-motion` + skip link.
- Status: `CLASSIFIED` → naik `READY` setelah audit Impeccable.
