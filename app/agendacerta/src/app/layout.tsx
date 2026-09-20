import type { Metadata } from "next";
import { Sora, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgendaCerta",
  description:
    "Confirmação de agenda por WhatsApp (demo) e painel para clínicas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${sourceSans.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
