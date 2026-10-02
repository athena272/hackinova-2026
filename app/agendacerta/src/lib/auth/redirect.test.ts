import { describe, expect, it } from "vitest";
import { buildLoginHref, DEFAULT_AFTER_LOGIN_PATH, sanitizeNextPath } from "./redirect";

describe("sanitizeNextPath", () => {
  it("mantém caminhos internos", () => {
    expect(sanitizeNextPath("/mock-whatsapp")).toBe("/mock-whatsapp");
  });

  it.each([
    null,
    undefined,
    "",
    "painel",
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
  ])("cai no painel para valor inseguro ou vazio: %s", (value) => {
    expect(sanitizeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN_PATH);
  });
});

describe("buildLoginHref", () => {
  it("monta /login sem next quando não informado", () => {
    expect(buildLoginHref()).toBe("/login");
  });

  it("codifica o caminho de retorno", () => {
    expect(buildLoginHref("/mock-whatsapp")).toBe("/login?next=%2Fmock-whatsapp");
  });
});
