import { describe, expect, it } from "vitest";
import { formatClinicTime, getClinicDate, getClinicDateTime, weekdayName } from "./clinic-time";

describe("getClinicDate", () => {
  it("devolve a data local da clínica, mesmo quando em UTC já é o dia seguinte", () => {
    expect(getClinicDate("2026-09-22T12:00:00.000Z")).toBe("2026-09-22");
    expect(getClinicDate("2026-10-01T02:30:00.000Z")).toBe("2026-09-30");
    expect(getClinicDate("2026-09-24T07:30:00-03:00")).toBe("2026-09-24");
  });

  it("rejeita data inválida", () => {
    expect(() => getClinicDate("ontem")).toThrow(RangeError);
  });
});

describe("getClinicDateTime", () => {
  it("converte UTC para o fuso de Maceió (UTC-3)", () => {
    expect(getClinicDateTime("2026-09-22T12:00:00.000Z")).toEqual({
      weekday: 2,
      hour: 9,
      minute: 0,
    });
  });

  it("vira o dia quando o horário UTC já é o dia seguinte", () => {
    expect(getClinicDateTime("2026-09-22T02:00:00.000Z")).toEqual({
      weekday: 1,
      hour: 23,
      minute: 0,
    });
  });

  it("aceita ISO com offset explícito", () => {
    expect(getClinicDateTime("2026-09-24T07:30:00-03:00")).toEqual({
      weekday: 4,
      hour: 7,
      minute: 30,
    });
  });

  it("meia-noite aparece como 0h, não 24h", () => {
    expect(getClinicDateTime("2026-09-22T03:00:00.000Z").hour).toBe(0);
  });

  it("rejeita data inválida", () => {
    expect(() => getClinicDateTime("ontem")).toThrow(RangeError);
  });
});

describe("formatação", () => {
  it("nomeia o dia da semana em português", () => {
    expect(weekdayName(1)).toBe("segunda-feira");
    expect(weekdayName(6)).toBe("sábado");
  });

  it("formata a hora com minutos", () => {
    expect(formatClinicTime({ weekday: 1, hour: 7, minute: 5 })).toBe("7h05");
  });
});
