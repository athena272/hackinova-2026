import { describe, expect, it } from "vitest";
import {
  createProcedure,
  InvalidProcedureError,
  isActiveBooking,
  isAppointmentStatus,
  isAttendanceOutcome,
  isPreparationResult,
  isProcedureType,
  isSlotReusable,
} from "./appointment";

describe("isActiveBooking", () => {
  it.each(["pendente", "confirmado"] as const)("%s ainda ocupa a vaga", (status) => {
    expect(isActiveBooking(status)).toBe(true);
  });

  it.each(["liberado", "remarcacao_solicitada", "compareceu", "faltou"] as const)(
    "%s não ocupa mais a vaga",
    (status) => {
      expect(isActiveBooking(status)).toBe(false);
    },
  );
});

describe("isAttendanceOutcome", () => {
  it.each(["compareceu", "faltou"] as const)("%s compõe o histórico", (status) => {
    expect(isAttendanceOutcome(status)).toBe(true);
  });

  it.each(["pendente", "confirmado", "liberado", "remarcacao_solicitada"] as const)(
    "%s ainda é agenda ativa",
    (status) => {
      expect(isAttendanceOutcome(status)).toBe(false);
    },
  );

  it("faltou não é vaga reaproveitável (diferente de liberado)", () => {
    expect(isSlotReusable("faltou")).toBe(false);
    expect(isSlotReusable("liberado")).toBe(true);
  });
});

describe("createProcedure", () => {
  it("consulta ignora o nome e é descrita só pela especialidade", () => {
    expect(createProcedure("consulta", null)).toEqual({ type: "consulta" });
    expect(createProcedure("consulta", "qualquer")).toEqual({ type: "consulta" });
  });

  it("exame mantém o nome sem espaços nas pontas", () => {
    expect(createProcedure("exame", "  Glicemia em jejum ")).toEqual({
      type: "exame",
      examName: "Glicemia em jejum",
    });
  });

  it.each([null, undefined, "", "   "])(
    "exame sem nome (%j) lança InvalidProcedureError",
    (name) => {
      expect(() => createProcedure("exame", name)).toThrow(InvalidProcedureError);
    },
  );
});

describe("guards de valores do domínio", () => {
  it("isAppointmentStatus aceita só status conhecidos", () => {
    expect(isAppointmentStatus("faltou")).toBe(true);
    expect(isAppointmentStatus("cancelado")).toBe(false);
    expect(isAppointmentStatus("toString")).toBe(false);
    expect(isAppointmentStatus(1)).toBe(false);
  });

  it("isProcedureType aceita só consulta e exame", () => {
    expect(isProcedureType("exame")).toBe(true);
    expect(isProcedureType("cirurgia")).toBe(false);
    expect(isProcedureType(null)).toBe(false);
  });

  it("isPreparationResult aceita só ok e nao_cumprido", () => {
    expect(isPreparationResult("ok")).toBe(true);
    expect(isPreparationResult("nao_cumprido")).toBe(true);
    expect(isPreparationResult("pendente")).toBe(false);
    expect(isPreparationResult("toString")).toBe(false);
    expect(isPreparationResult(null)).toBe(false);
  });
});
