import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regressão Windows/Docker Desktop: serviços extras do Supabase local
 * geram loop (vector) ou Exit 255 (edge_runtime). O MVP só precisa de
 * Postgres + Data API. Parar a stack deve ser via `npx supabase stop`,
 * não pelo botão Stop do Docker Desktop (containers usam unless-stopped).
 */
describe("supabase/config.toml (hardening local)", () => {
  const configPath = join(process.cwd(), "../../supabase/config.toml");
  const config = readFileSync(configPath, "utf8");

  function sectionEnabled(section: string): boolean | null {
    const pattern = new RegExp(
      `\\[${section}\\][\\s\\S]*?^enabled\\s*=\\s*(true|false)`,
      "m",
    );
    const match = config.match(pattern);
    if (!match) {
      return null;
    }
    return match[1] === "true";
  }

  it("mantém analytics desligado (evita loop do supabase_vector)", () => {
    expect(sectionEnabled("analytics")).toBe(false);
  });

  it("mantém edge_runtime desligado (evita Exit 255 sem Edge Functions)", () => {
    expect(sectionEnabled("edge_runtime")).toBe(false);
  });

  it("documenta o stop oficial no README do supabase", () => {
    const readme = readFileSync(
      join(process.cwd(), "../../supabase/README.md"),
      "utf8",
    );
    expect(readme).toMatch(/npx supabase stop/);
    expect(readme).toMatch(/Docker Desktop/i);
    expect(readme).toMatch(/unless-stopped/);
  });
});
