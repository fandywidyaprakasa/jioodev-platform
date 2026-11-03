import { cookies } from "next/headers";
import type { Locale } from "./i18n";

export const LOCALE_COOKIE = "jioodev_locale";

export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return value === "en" ? "en" : "id";
}
