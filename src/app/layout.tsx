import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import { ToastProvider } from "@/shared/ui/toast";
import { AuthSessionProvider } from "@/modules/auth/session-provider";

const themeScript = `(function(){try{var t=localStorage.getItem("jioodev-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

const siteUrl = process.env.SITE_URL ?? "https://jioo.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "JiooDev — AI-Powered Digital Production Ecosystem",
    template: "%s · JiooDev",
  },
  description:
    "Ubah kebutuhan bisnis menjadi produk digital siap pakai melalui AI Transformation.",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "JiooDev",
    title: "JiooDev — AI-Powered Digital Production Ecosystem",
    description:
      "Business context, template relevan, preview varian, dan deploy terkelola.",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "JiooDev — AI-Powered Digital Production Ecosystem",
    description:
      "Business context, template relevan, preview varian, dan deploy terkelola.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-body antialiased">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink focus:shadow-md"
        >
          Lewati ke konten
        </a>
        <AuthSessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
