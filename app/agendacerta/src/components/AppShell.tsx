"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, Home, LayoutDashboard, MessageCircle } from "lucide-react";

type AppShellProps = {
  children: ReactNode;
};

const LINKS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/mock-whatsapp", label: "Mock WhatsApp", icon: MessageCircle },
] as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <header className="topnav">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            <CalendarCheck2 size={18} strokeWidth={2.4} />
          </span>
          AgendaCerta
        </Link>
        <nav className="nav-links" aria-label="Principal">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : undefined}
              >
                <Icon size={16} strokeWidth={2.2} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
