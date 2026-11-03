export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function dateID(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function dateTimeID(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draf",
    INTAKE: "Isi Konteks",
    COMPREHENDED: "Terkonfirmasi",
    TEMPLATE_CHOSEN: "Template Dipilih",
    GENERATING: "Generate",
    PREVIEWS: "Preview",
    PICKED: "Dipilih",
    PAID: "Dibayar",
    DEPLOYED: "Live",
    ACTIVE: "Aktif",
    PENDING: "Menunggu",
    CONFIRMED: "Terkonfirmasi",
    FAILED: "Gagal",
    REFUNDED: "Refund",
    QUEUED: "Antre",
    PROCESSING: "Proses",
    READY: "Siap",
    EXHAUSTED: "Kuota habis",
    EXPIRED: "Kedaluwarsa",
    SUSPENDED: "Ditangguhkan",
    DELETED: "Dihapus",
  };
  return labels[status] ?? status;
}
