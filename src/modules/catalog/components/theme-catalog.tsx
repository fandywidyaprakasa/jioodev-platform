"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Monitor,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { PreviewModal, type PreviewModalEntry } from "./preview-modal";
import { api } from "@/shared/lib/api";
import { Badge, Button, Card, Empty, Input, useToast } from "@/shared/ui";
import {
  industryLabel,
  industryLabels,
  layoutLabel,
  productLabel,
  purposeLabel,
  purposeLabels,
  styleLabel,
  tierLabel,
} from "@/shared/lib/taxonomy";
import type {
  ProductType,
  Template,
  Theme,
  ThemeTier,
} from "@/shared/types";

interface VariantEntry {
  theme: Theme;
  product: ProductType;
  tier: ThemeTier;
  variant: Template;
}

type FilterKey =
  | "product"
  | "style"
  | "layout"
  | "tier"
  | "industry"
  | "purpose";

type CatalogDevice = "desktop" | "tablet" | "mobile";

const CATALOG_DEVICES: Array<{
  id: CatalogDevice;
  label: string;
  Icon: typeof Monitor;
}> = [
  { id: "desktop", label: "Web", Icon: Monitor },
  { id: "tablet", label: "Tablet", Icon: Tablet },
  { id: "mobile", label: "Mobile", Icon: Smartphone },
];

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-xs text-muted">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function themeGradient(style: string) {
  if (style === "VAR") return "from-sky-100 via-white to-amber-50";
  if (style === "MIN") return "from-zinc-100 via-white to-zinc-50";
  return "from-[#f4e4da] via-[#fffcf6] to-[#e3d8c8]";
}

export function ThemeCatalog({
  themes,
  mode = "browse",
  projectId,
  contextNote,
  useTemplateHref,
  initialTemplateCode,
}: {
  themes: Theme[];
  mode?: "browse" | "pick";
  projectId?: string;
  contextNote?: string;
  useTemplateHref?: string;
  initialTemplateCode?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<ProductType | "ALL">("ALL");
  const [styleFilter, setStyleFilter] = useState("");
  const [layoutFilter, setLayoutFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<ThemeTier | "">("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [catalogDevice, setCatalogDevice] = useState<CatalogDevice>("desktop");
  const [view, setView] = useState<"themes" | "variants">(
    useTemplateHref ? "variants" : "themes",
  );
  const [modalEntries, setModalEntries] = useState<PreviewModalEntry[] | null>(
    null,
  );
  const [modalIndex, setModalIndex] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(
    mode === "pick" ? themes[0]?.themeId ?? null : null,
  );
  const [product, setProduct] = useState<ProductType | null>(
    mode === "pick" ? themes[0]?.products[0]?.type ?? null : null,
  );
  const [tier, setTier] = useState<ThemeTier | null>(null);
  const [selected, setSelected] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState(false);

  const allVariants = useMemo<VariantEntry[]>(
    () =>
      themes.flatMap((theme) =>
        theme.products.flatMap((product) =>
          product.tiers.flatMap((tier) =>
            tier.variants.map((variant) => ({
              theme,
              product: product.type,
              tier: tier.tier,
              variant,
            })),
          ),
        ),
      ),
    [themes],
  );

  const initialEntry = useMemo(
    () =>
      initialTemplateCode
        ? allVariants.find((entry) => entry.variant.code === initialTemplateCode)
        : undefined,
    [allVariants, initialTemplateCode],
  );

  useEffect(() => {
    if (mode !== "pick" || initialized) return;
    if (initialEntry) {
      setActiveThemeId(initialEntry.theme.themeId);
      setProduct(initialEntry.product);
      setTier(initialEntry.tier);
      setSelected(initialEntry.variant.code);
    }
    setInitialized(true);
  }, [initialEntry, initialized, mode]);

  const styleOptions = useMemo(
    () => [...new Set(allVariants.map((entry) => entry.variant.style))].sort(),
    [allVariants],
  );
  const layoutOptions = useMemo(
    () => [...new Set(allVariants.map((entry) => entry.variant.layout))].sort(),
    [allVariants],
  );
  const industryOptions = useMemo(
    () =>
      [...new Set(allVariants.flatMap((entry) => entry.variant.industries))].sort(),
    [allVariants],
  );
  const purposeOptions = useMemo(
    () =>
      [...new Set(allVariants.flatMap((entry) => entry.variant.purposes))].sort(),
    [allVariants],
  );

  const matchesExcept = useCallback(
    (entry: VariantEntry, skip?: FilterKey) => {
      if (
        skip !== "product" &&
        productFilter !== "ALL" &&
        entry.product !== productFilter
      ) {
        return false;
      }
      if (skip !== "style" && styleFilter && entry.variant.style !== styleFilter) {
        return false;
      }
      if (
        skip !== "layout" &&
        layoutFilter &&
        entry.variant.layout !== layoutFilter
      ) {
        return false;
      }
      if (skip !== "tier" && tierFilter && entry.tier !== tierFilter) {
        return false;
      }
      if (
        skip !== "industry" &&
        industryFilter &&
        !entry.variant.industries.includes(industryFilter)
      ) {
        return false;
      }
      if (
        skip !== "purpose" &&
        purposeFilter &&
        !entry.variant.purposes.includes(purposeFilter)
      ) {
        return false;
      }
      return true;
    },
    [
      industryFilter,
      layoutFilter,
      productFilter,
      purposeFilter,
      styleFilter,
      tierFilter,
    ],
  );

  function countFor(
    skip: FilterKey,
    predicate: (entry: VariantEntry) => boolean,
  ) {
    return allVariants.filter(
      (entry) => matchesExcept(entry, skip) && predicate(entry),
    ).length;
  }

  const visibleVariants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allVariants.filter((entry) => {
      if (!matchesExcept(entry)) return false;
      if (!needle) return true;
      return `${entry.theme.name} ${entry.theme.description} ${styleLabel(entry.theme.style)} ${entry.variant.name} ${entry.variant.variantLabel ?? ""} ${layoutLabel(entry.variant.layout)} ${styleLabel(entry.variant.style)} ${industryLabels(entry.variant.industries)} ${purposeLabels(entry.variant.purposes)} ${entry.variant.industries.join(" ")} ${entry.variant.purposes.join(" ")}`
        .toLowerCase()
        .includes(needle);
    });
  }, [allVariants, matchesExcept, query]);

  function clearFilter(key: FilterKey) {
    if (key === "product") setProductFilter("ALL");
    if (key === "style") setStyleFilter("");
    if (key === "layout") setLayoutFilter("");
    if (key === "tier") setTierFilter("");
    if (key === "industry") setIndustryFilter("");
    if (key === "purpose") setPurposeFilter("");
  }

  function clearAllFilters() {
    setQuery("");
    setProductFilter("ALL");
    setStyleFilter("");
    setLayoutFilter("");
    setTierFilter("");
    setIndustryFilter("");
    setPurposeFilter("");
  }

  const activeChips: { key: FilterKey; label: string }[] = [];
  if (productFilter !== "ALL") {
    activeChips.push({
      key: "product",
      label: `Produk: ${productLabel(productFilter)}`,
    });
  }
  if (styleFilter) {
    activeChips.push({ key: "style", label: `Gaya: ${styleLabel(styleFilter)}` });
  }
  if (layoutFilter) {
    activeChips.push({
      key: "layout",
      label: `Layout: ${layoutLabel(layoutFilter)}`,
    });
  }
  if (tierFilter) {
    activeChips.push({ key: "tier", label: `Tier: ${tierLabel(tierFilter)}` });
  }
  if (industryFilter) {
    activeChips.push({
      key: "industry",
      label: `Industri: ${industryLabel(industryFilter)}`,
    });
  }
  if (purposeFilter) {
    activeChips.push({
      key: "purpose",
      label: `Tujuan: ${purposeLabel(purposeFilter)}`,
    });
  }
  const advancedActiveCount = [styleFilter, layoutFilter, tierFilter].filter(
    Boolean,
  ).length;

  const visibleThemes = useMemo(() => {
    const ids = new Set(visibleVariants.map((entry) => entry.theme.themeId));
    return themes.filter((theme) => ids.has(theme.themeId));
  }, [themes, visibleVariants]);

  useEffect(() => {
    if (mode !== "pick") return;
    if (activeThemeId && visibleThemes.some((theme) => theme.themeId === activeThemeId)) {
      return;
    }
    setActiveThemeId(visibleThemes[0]?.themeId ?? null);
  }, [activeThemeId, mode, visibleThemes]);

  const activeFilters =
    productFilter !== "ALL" ||
    Boolean(styleFilter || layoutFilter || tierFilter || industryFilter || purposeFilter);

  const deviceIndex = CATALOG_DEVICES.findIndex(
    (device) => device.id === catalogDevice,
  );
  const currentDevice =
    CATALOG_DEVICES[deviceIndex] ?? CATALOG_DEVICES[0];
  const nextDevice =
    CATALOG_DEVICES[(deviceIndex + 1) % CATALOG_DEVICES.length] ??
    CATALOG_DEVICES[0];
  const catalogGridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
  const thumbnailAspect =
    catalogDevice === "desktop"
      ? "aspect-[16/10]"
      : catalogDevice === "tablet"
        ? "aspect-[4/3]"
        : "aspect-[4/5]";

  const activeTheme = themes.find((theme) => theme.themeId === activeThemeId);
  const activeProduct =
    activeTheme?.products.find((item) => item.type === product) ??
    activeTheme?.products[0];
  const tiers = activeProduct?.tiers ?? [];
  const activeTier = tiers.find((item) => item.tier === tier) ?? tiers[0];
  const versions = activeTier?.variants ?? [];
  const selectedVariant =
    versions.find((variant) => variant.code === selected) ?? versions[0];

  function variantsForTheme(theme: Theme): PreviewModalEntry[] {
    return theme.products.flatMap((product) =>
      product.tiers.flatMap((tier) =>
        tier.variants.map((variant) => ({
          themeName: theme.name,
          product: product.type,
          tier: tier.tier,
          variant,
        })),
      ),
    );
  }

  function openThemePreview(theme: Theme) {
    const entries = variantsForTheme(theme);
    if (!entries.length) return;
    setModalEntries(entries);
    setModalIndex(0);
  }

  function openVariantPreview(index: number) {
    if (!visibleVariants.length) return;
    setModalEntries(
      visibleVariants.map((entry) => ({
        themeName: entry.theme.name,
        product: entry.product,
        tier: entry.tier,
        variant: entry.variant,
      })),
    );
    setModalIndex(index);
  }

  function chooseTheme(theme: Theme) {
    setActiveThemeId(theme.themeId);
    setProduct(theme.products[0]?.type ?? null);
    setTier(null);
    setSelected(undefined);
  }

  async function chooseVariantCode(code: string) {
    if (!projectId) return;
    startTransition(async () => {
      try {
        await api.projects.update(projectId, {
          templateCode: code,
          status: "TEMPLATE_CHOSEN",
        });
        toast({
          title: "Varian dipilih",
          description: "Template berhasil dipilih.",
        });
        router.push(`/app/projects/${projectId}/preview`);
      } catch (error) {
        toast({
          title: "Gagal memilih varian",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function useVariant() {
    if (!projectId || !selectedVariant) return;
    startTransition(async () => {
      try {
        await api.projects.update(projectId, {
          templateCode: selectedVariant.code,
          status: "TEMPLATE_CHOSEN",
        });
        toast({
          title: "Varian dipilih",
          description: `${activeTheme?.name ?? "Theme"} · ${selectedVariant.variantLabel ?? selectedVariant.name}`,
        });
        router.push(`/app/projects/${projectId}/preview`);
      } catch (error) {
        toast({
          title: "Gagal memilih varian",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function themeSnapshot(theme: Theme, device: CatalogDevice) {
    const entries = variantsForTheme(theme);
    const primary =
      entries.find(
        (entry) => entry.variant.code === theme.primaryVariantCode,
      ) ?? entries[0];
    const file = device === "desktop" ? "web" : device;
    if (!primary?.variant.code) return theme.thumbnailUrl;
    const version = primary.variant.previewHash
      ? `?v=${encodeURIComponent(primary.variant.previewHash)}`
      : "";
    return `/template-previews/${primary.variant.code}/${file}.webp${version}`;
  }

  if (!themes.length) {
    return (
      <Empty
        title="Belum ada theme untuk tipe ini"
        description="Katalog untuk tipe produk ini belum siap. Pilih tipe lain atau hubungi admin."
      />
    );
  }

  return (
    <div className="space-y-6">
      {contextNote ? (
        <p className="rounded-md border border-line bg-paper px-3 py-2 text-xs text-muted">
          {contextNote}
        </p>
      ) : null}

      <Input
        label="Cari theme"
        placeholder="Nama theme, gaya, atau kata kunci"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {activeChips.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => clearFilter(chip.key)}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs text-ink transition-colors hover:border-accent"
            >
              {chip.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-accent hover:underline"
          >
            Reset semua
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <FilterSelect
          label="Produk"
          value={productFilter}
          onChange={(value) =>
            setProductFilter(value as ProductType | "ALL")
          }
        >
          <option value="ALL">
            Semua produk ({countFor("product", () => true)})
          </option>
          {(["LAND", "WEB", "COMM"] as ProductType[]).map((value) => {
            const count = countFor("product", (entry) => entry.product === value);
            return (
              <option
                key={value}
                value={value}
                disabled={count === 0 && value !== productFilter}
              >
                {productLabel(value)} ({count})
              </option>
            );
          })}
        </FilterSelect>

        <FilterSelect
          label="Industri"
          value={industryFilter}
          onChange={setIndustryFilter}
        >
          <option value="">Semua industri ({countFor("industry", () => true)})</option>
          {industryOptions.map((value) => {
            const count = countFor("industry", (entry) =>
              entry.variant.industries.includes(value),
            );
            return (
              <option
                key={value}
                value={value}
                disabled={count === 0 && value !== industryFilter}
              >
                {industryLabel(value)} ({count})
              </option>
            );
          })}
        </FilterSelect>

        <FilterSelect
          label="Tujuan"
          value={purposeFilter}
          onChange={setPurposeFilter}
        >
          <option value="">Semua tujuan ({countFor("purpose", () => true)})</option>
          {purposeOptions.map((value) => {
            const count = countFor("purpose", (entry) =>
              entry.variant.purposes.includes(value),
            );
            return (
              <option
                key={value}
                value={value}
                disabled={count === 0 && value !== purposeFilter}
              >
                {purposeLabel(value)} ({count})
              </option>
            );
          })}
        </FilterSelect>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filter lanjutan
          {advancedActiveCount ? ` (${advancedActiveCount})` : ""}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              advancedOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {advancedOpen ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <FilterSelect
              label="Gaya"
              value={styleFilter}
              onChange={setStyleFilter}
            >
              <option value="">Semua gaya ({countFor("style", () => true)})</option>
              {styleOptions.map((value) => {
                const count = countFor(
                  "style",
                  (entry) => entry.variant.style === value,
                );
                return (
                  <option
                    key={value}
                    value={value}
                    disabled={count === 0 && value !== styleFilter}
                  >
                    {styleLabel(value)} ({count})
                  </option>
                );
              })}
            </FilterSelect>

            <FilterSelect
              label="Layout"
              value={layoutFilter}
              onChange={setLayoutFilter}
            >
              <option value="">
                Semua layout ({countFor("layout", () => true)})
              </option>
              {layoutOptions.map((value) => {
                const count = countFor(
                  "layout",
                  (entry) => entry.variant.layout === value,
                );
                return (
                  <option
                    key={value}
                    value={value}
                    disabled={count === 0 && value !== layoutFilter}
                  >
                    {layoutLabel(value)} ({count})
                  </option>
                );
              })}
            </FilterSelect>

            <FilterSelect
              label="Tier"
              value={tierFilter}
              onChange={(value) => setTierFilter(value as ThemeTier | "")}
            >
              <option value="">Semua tier ({countFor("tier", () => true)})</option>
              {(["BASIC", "PRO", "AGENCY"] as ThemeTier[]).map((value) => {
                const count = countFor("tier", (entry) => entry.tier === value);
                return (
                  <option
                    key={value}
                    value={value}
                    disabled={count === 0 && value !== tierFilter}
                  >
                    {tierLabel(value)} ({count})
                  </option>
                );
              })}
            </FilterSelect>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border border-line bg-paper p-1">
          {(["themes", "variants"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded px-3 py-1.5 text-xs ${
                view === mode
                  ? "bg-accent text-on-accent"
                  : "text-muted hover:text-ink"
              }`}
            >
              {mode === "themes" ? "Theme" : "Semua varian"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <button
            type="button"
            onClick={() => setCatalogDevice(nextDevice.id)}
            aria-label={`Tampilan ${currentDevice.label}. Klik untuk ${nextDevice.label}.`}
            title={`Tampilan ${currentDevice.label} · klik ${nextDevice.label}`}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-paper text-muted transition-colors duration-150 hover:border-ink/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <currentDevice.Icon className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="tabular-nums">{visibleThemes.length} theme · {visibleVariants.length} varian</span>
          {activeFilters ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-accent hover:underline"
            >
              Reset filter
            </button>
          ) : null}
        </div>
      </div>

      {visibleVariants.length === 0 ? (
        <Empty
          title="Tidak ada yang cocok"
          description="Coba kata kunci lain, atau longgarkan filter yang aktif."
          action={
            <Button size="sm" onClick={clearAllFilters}>
              Reset filter
            </Button>
          }
        />
      ) : view === "variants" ? (
        <div className={catalogGridClass} data-device={catalogDevice}>
          {visibleVariants.map((entry, index) => (
            <div
              key={`${entry.theme.themeId}-${entry.product}-${entry.tier}-${entry.variant.code}`}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              onClick={() => openVariantPreview(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openVariantPreview(index);
                }
              }}
              className="flex cursor-pointer flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm transition-colors hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {entry.variant.variantLabel ?? entry.variant.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {entry.theme.name} · {productLabel(entry.product)} · {tierLabel(entry.tier)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{layoutLabel(entry.variant.layout)}</Badge>
                <Badge>{styleLabel(entry.variant.style)}</Badge>
                {entry.variant.industries.slice(0, 2).map((industry) => (
                  <Badge key={industry}>{industryLabel(industry)}</Badge>
                ))}
              </div>
              {mode === "browse" ? (
                useTemplateHref ? (
                  <Link
                    href={`${useTemplateHref}?template=${encodeURIComponent(entry.variant.code)}`}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-auto text-xs font-medium text-accent hover:underline"
                  >
                    Gunakan template
                  </Link>
                ) : (
                  <Link
                    href={`/templates/${entry.variant.code}`}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-auto text-xs font-medium text-accent hover:underline"
                  >
                    Detail varian
                  </Link>
                )
              ) : (
                <Button
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    void chooseVariantCode(entry.variant.code);
                  }}
                >
                  Gunakan varian
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
      <div className={catalogGridClass} data-device={catalogDevice}>
        {visibleThemes.map((theme) => {
          const active = theme.themeId === activeThemeId;
          const matchCount = visibleVariants.filter(
            (entry) => entry.theme.themeId === theme.themeId,
          ).length;
          const content = (
            <>
              <div className={`relative overflow-hidden border-b border-line ${thumbnailAspect}`}>
                {themeSnapshot(theme, catalogDevice) ? (
                  <Image
                    src={themeSnapshot(theme, catalogDevice) as string}
                    alt={`Preview ${theme.name}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-br ${themeGradient(theme.style)}`}
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink">
                      {theme.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {theme.description}
                    </p>
                  </div>
                  <Badge variant={active ? "accent" : "neutral"}>
                    {styleLabel(theme.style)}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {activeFilters ? `${matchCount} varian cocok · ` : `${theme.variantCount} varian · `}
                  {theme.products.map((item) => productLabel(item.type)).join(", ")}
                </p>
              </div>
            </>
          );

          return (
            <button
              key={theme.themeId}
              type="button"
              onClick={() => {
                if (mode === "pick") chooseTheme(theme);
                openThemePreview(theme);
              }}
              aria-pressed={mode === "pick" ? active : undefined}
              aria-haspopup="dialog"
              className={`group overflow-hidden rounded-lg border bg-surface text-left shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 ${
                mode === "pick" && active
                  ? "border-accent shadow-md"
                  : "border-line hover:border-ink/30 hover:shadow-md"
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>
      )}

      {mode === "pick" && activeTheme ? (
        <Card
          title={`${activeTheme.name} — pilih varian`}
          description="Pilih tipe produk, tier, lalu varian yang paling sesuai."
        >
          {activeTheme.products.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeTheme.products.map((item) => (
                <Button
                  key={item.type}
                  size="sm"
                  variant={item.type === activeProduct?.type ? "primary" : "secondary"}
                  onClick={() => {
                    setProduct(item.type);
                    setTier(null);
                    setSelected(undefined);
                  }}
                >
                  {productLabel(item.type)}
                </Button>
              ))}
            </div>
          ) : null}

          {tiers.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {tiers.map((item) => (
                <Button
                  key={item.tier}
                  size="sm"
                  variant={item.tier === activeTier?.tier ? "primary" : "secondary"}
                  onClick={() => {
                    setTier(item.tier);
                    setSelected(undefined);
                  }}
                >
                  {tierLabel(item.tier)}
                </Button>
              ))}
            </div>
          ) : tiers[0] ? (
            <p className="mb-4 text-xs text-muted">Tier: {tierLabel(tiers[0].tier)}</p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
            <div className="space-y-2">
              {versions.map((variant) => {
                const active = selectedVariant?.code === variant.code;
                return (
                  <button
                    key={variant.code}
                    type="button"
                    onClick={() => setSelected(variant.code)}
                    aria-pressed={active}
                    className={`w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent-soft"
                        : "border-line hover:border-ink/30"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">
                        {variant.variantLabel ?? variant.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        {layoutLabel(variant.layout)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {industryLabels(variant.industries) || "Umum"}
                      {variant.purposes.length
                        ? ` · ${purposeLabels(variant.purposes)}`
                        : ""}
                    </span>
                  </button>
                );
              })}
              {!versions.length ? (
                <p className="text-sm text-muted">
                  Tidak ada varian pada tier ini.
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-line bg-paper">
              {selectedVariant ? (
                <>
                  <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-muted">
                    <span>{selectedVariant.variantLabel ?? selectedVariant.name}</span>
                    <a
                      href={selectedVariant.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:underline"
                    >
                      Buka preview
                    </a>
                  </div>
                  <iframe
                    src={selectedVariant.previewUrl}
                    title={`Preview ${selectedVariant.name}`}
                    className="h-[420px] w-full bg-white"
                    loading="lazy"
                  />
                </>
              ) : (
                <p className="p-4 text-sm text-muted">Pilih varian untuk preview.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-muted">
              {selectedVariant
                ? `Dipilih: ${activeTheme.name} · ${selectedVariant.variantLabel ?? selectedVariant.name}`
                : "Belum ada varian dipilih."}
            </p>
            <Button onClick={useVariant} disabled={!selectedVariant} loading={pending}>
              Gunakan Varian
            </Button>
          </div>
        </Card>
      ) : null}

      {modalEntries ? (
        <PreviewModal
          entries={modalEntries}
          initialIndex={modalIndex}
          projectId={projectId}
          onClose={() => setModalEntries(null)}
          onUse={
            projectId
              ? (code) => {
                  setModalEntries(null);
                  void chooseVariantCode(code);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
