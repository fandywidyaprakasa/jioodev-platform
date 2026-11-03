"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("jioodev-theme", next);
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Tema antarmuka">
      <Button
        size="sm"
        variant={theme === "light" ? "primary" : "secondary"}
        onClick={() => apply("light")}
        aria-pressed={theme === "light"}
      >
        Terang
      </Button>
      <Button
        size="sm"
        variant={theme === "dark" ? "primary" : "secondary"}
        onClick={() => apply("dark")}
        aria-pressed={theme === "dark"}
      >
        Gelap
      </Button>
    </div>
  );
}
