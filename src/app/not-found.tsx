import Link from "next/link";
import { Empty } from "@/shared/ui";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Empty
        title="Halaman tidak ditemukan"
        description="Tautan mungkin sudah dipindahkan atau tidak pernah ada."
        action={
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
          >
            Kembali ke Beranda
          </Link>
        }
      />
    </div>
  );
}
