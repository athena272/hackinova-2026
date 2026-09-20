import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
