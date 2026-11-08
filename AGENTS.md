# AGENTS.md — app/

Aturan induk ada di [`../AGENTS.md`](../AGENTS.md). **Code health adalah prioritas #1** — jangan menukar kebenaran, keamanan, dan kemudahan perawatan dengan kecepatan fitur.

Sebelum menyatakan tugas kode selesai, jalankan dari `app/` dan laporkan hasilnya:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm check:boundaries`
- `pnpm build` (untuk perubahan yang memengaruhi build/runtime)
- `pnpm audit --prod` (untuk perubahan dependency/keamanan)

**Zero-regression:** jika gate merah, perbaiki atau laporkan blocker. Jangan klaim "selesai", melemahkan tes, atau mematikan pengecekan demi hijau.

Aturan lengkap (security server-side, git, deploy, template preview) ada di [`../AGENTS.md`](../AGENTS.md).
