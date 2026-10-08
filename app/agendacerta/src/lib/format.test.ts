import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatCurrency,
  formatDateTime,
  formatDistance,
  formatPercent,
  formatTime,
  initials,
  remainingMs,
} from "./format";

// Intl separa "R$" do valor com espaço não separável.
const plain = (text: string) => text.replace(/\u00a0/g, " ");

describe("formatCurrency", () => {
  it("mostra reais sem centavos quando o valor é inteiro", () => {
    expect(plain(formatCurrency(750))).toBe("R$ 750");
    expect(plain(formatCurrency(0))).toBe("R$ 0");
  });

  it("usa separador de milhar e centavos quando existem", () => {
    expect(plain(formatCurrency(1250.5))).toBe("R$ 1.250,50");
  });
});

describe("formatPercent", () => {
  it("converte a fração em porcentagem com até uma casa", () => {
    expect(plain(formatPercent(0.5))).toBe("50%");
    expect(plain(formatPercent(1 / 3))).toBe("33,3%");
    expect(plain(formatPercent(0))).toBe("0%");
  });
});

describe("formatTime", () => {
  it("formata só a hora em pt-BR", () => {
    expect(formatTime("2026-10-20T12:34:00.000Z")).toMatch(/^\d{2}:34$/);
  });
});

describe("remainingMs e formatCountdown", () => {
  const until = "2026-10-06T15:15:00.000Z";

  it("conta o tempo até o prazo e nunca fica negativo", () => {
    expect(remainingMs(until, Date.parse("2026-10-06T15:10:00.000Z"))).toBe(5 * 60_000);
    expect(remainingMs(until, Date.parse("2026-10-06T15:20:00.000Z"))).toBe(0);
  });

  it("mostra mm:ss, arredondando o segundo para cima", () => {
    expect(formatCountdown(5 * 60_000)).toBe("05:00");
    expect(formatCountdown(61_500)).toBe("01:02");
    expect(formatCountdown(999)).toBe("00:01");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-10)).toBe("00:00");
  });

  it("passa de 60 minutos sem virar hora", () => {
    expect(formatCountdown(90 * 60_000)).toBe("90:00");
  });
});

describe("formatDistance", () => {
  it("usa vírgula e uma casa, ou avisa quando não sabe", () => {
    expect(formatDistance(3.74)).toBe("3,7 km");
    expect(formatDistance(13)).toBe("13 km");
    expect(formatDistance(null)).toBe("distância desconhecida");
  });
});

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
