import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-balance font-display text-3xl leading-tight tracking-[-0.025em] text-ink">
        Akun memakai Google.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        JiooDev tidak menyimpan kata sandi lokal. Untuk memulihkan akses, pulihkan
        akun Google yang Anda gunakan saat mendaftar, lalu masuk kembali.
      </p>
      <ol className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-muted">
        <li>1. Buka halaman pemulihan akun Google.</li>
        <li>2. Ikuti langkah verifikasi dari Google.</li>
        <li>3. Kembali ke JiooDev dan masuk dengan akun tersebut.</li>
      </ol>
      <Link
        href="/login"
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke Masuk
      </Link>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Butuh bantuan lain?{" "}
        <Link href="/contact" className="font-medium text-accent hover:underline">
          Hubungi kami
        </Link>
        .
      </p>
    </div>
  );
}
