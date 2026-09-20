import type { ReactNode } from "react";
import Link from "next/link";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="shell">
      <header className="topnav">
        <Link href="/" className="brand">
          AgendaCerta
        </Link>
        <nav className="nav-links">
          <Link href="/">Início</Link>
          <Link href="/painel">Painel</Link>
          <Link href="/mock-whatsapp">Mock WhatsApp</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
