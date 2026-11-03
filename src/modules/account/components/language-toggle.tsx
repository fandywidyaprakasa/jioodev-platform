"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui";

const LOCALE_COOKIE = "jioodev_locale";

export function LanguageToggle({ initial = "id" }: { initial?: "id" | "en" }) {
  const router = useRouter();
  const [locale, setLocale] = useState(initial);

  function choose(next: "id" | "en") {
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Bahasa antarmuka">
      <Button
        size="sm"
        variant={locale === "id" ? "primary" : "secondary"}
        onClick={() => choose("id")}
        aria-pressed={locale === "id"}
      >
        Indonesia
      </Button>
      <Button
        size="sm"
        variant={locale === "en" ? "primary" : "secondary"}
        onClick={() => choose("en")}
        aria-pressed={locale === "en"}
      >
        English
      </Button>
    </div>
  );
}
