export const INDUSTRY_LABELS: Record<string, string> = {
  GEN: "Umum",
  RET: "Retail",
  FNB: "F&B",
  PRO: "Profesional",
  BEA: "Beauty",
  EVE: "Event",
  FIN: "Keuangan",
  HTH: "Kesehatan",
  TCI: "Teknologi",
  TRV: "Travel",
  FSH: "Fashion",
  REA: "Properti",
  CON: "Konstruksi",
  AGR: "Agrikultur",
};

export const PURPOSE_LABELS: Record<string, string> = {
  SAL: "Penjualan",
  VIS: "Visibilitas",
  LDG: "Lead generation",
  ORD: "Order",
  BOK: "Booking",
  SSV: "Showcase layanan",
  BRD: "Branding",
  POR: "Portofolio",
};

export const STYLE_LABELS: Record<string, string> = {
  EDT: "Editorial",
  WRM: "Warm",
  MIN: "Minimalis",
  VAR: "Variatif",
};

export const LAYOUT_LABELS: Record<string, string> = {
  "L-SPLIT": "Split hero",
  "L-MENU": "Menu",
  "L-SVC": "Layanan",
  "L-PORT": "Portofolio",
  "L-CONV": "Konversi",
  "L-STORY": "Story",
  "L-PRICE": "Price list",
  "L-BOOK": "Booking",
  "L-GRID": "Grid katalog",
};

export const TIER_LABELS: Record<string, string> = {
  BASIC: "Basic",
  PRO: "Pro",
  AGENCY: "Agency",
};

export const PRODUCT_LABELS: Record<string, string> = {
  LAND: "Landing",
  WEB: "Website",
  COMM: "Commerce",
};

function label(map: Record<string, string>, code: string | null | undefined) {
  if (!code) return "";
  return map[code] ?? code;
}

export function industryLabel(code: string | null | undefined) {
  return label(INDUSTRY_LABELS, code);
}

export function purposeLabel(code: string | null | undefined) {
  return label(PURPOSE_LABELS, code);
}

export function styleLabel(code: string | null | undefined) {
  return label(STYLE_LABELS, code);
}

export function layoutLabel(code: string | null | undefined) {
  return label(LAYOUT_LABELS, code);
}

export function tierLabel(code: string | null | undefined) {
  return label(TIER_LABELS, code);
}

export function productLabel(code: string | null | undefined) {
  return label(PRODUCT_LABELS, code);
}

export function industryLabels(codes: string[] | null | undefined) {
  return (codes ?? []).map(industryLabel).join(", ");
}

export function purposeLabels(codes: string[] | null | undefined) {
  return (codes ?? []).map(purposeLabel).join(", ");
}
