import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "JiooDev — AI-Powered Digital Production Ecosystem",
  description:
    "Ubah kebutuhan bisnis menjadi produk digital siap pakai melalui AI Transformation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
