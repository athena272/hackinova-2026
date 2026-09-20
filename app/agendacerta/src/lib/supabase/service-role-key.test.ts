import { describe, expect, it } from "vitest";
import { assertServiceRoleKey } from "./service-role-key";

function jwtWithRole(role: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ role, iss: "supabase" }),
  ).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("assertServiceRoleKey", () => {
  it("aceita sb_secret_", () => {
    expect(() =>
      assertServiceRoleKey("sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"),
    ).not.toThrow();
  });

  it("aceita JWT service_role", () => {
    expect(() => assertServiceRoleKey(jwtWithRole("service_role"))).not.toThrow();
  });

  it("rejeita publishable key", () => {
    expect(() =>
      assertServiceRoleKey("sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"),
    ).toThrow(/anon\/publishable/i);
  });

  it("rejeita JWT anon", () => {
    expect(() => assertServiceRoleKey(jwtWithRole("anon"))).toThrow(/role anon/i);
  });

  it("rejeita chave vazia", () => {
    expect(() => assertServiceRoleKey("   ")).toThrow(/vazia/i);
  });
});
