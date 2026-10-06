import { describe, expect, it } from "vitest";
import { formatDateTime, initials } from "./format";

describe("formatDateTime", () => {
  it("formata data e hora curtas em pt-BR", () => {
    expect(formatDateTime("2026-10-20T12:00:00.000Z")).toMatch(/^20\/10\/2026,? \d{2}:00$/);
  });
});

describe("initials", () => {
  it("usa as duas primeiras iniciais em maiúsculas", () => {
    expect(initials("marcos de lima")).toBe("MD");
    expect(initials("Ana")).toBe("A");
  });

  it("ignora espaços repetidos", () => {
    expect(initials("  Olívia   Martins ")).toBe("OM");
  });
});
