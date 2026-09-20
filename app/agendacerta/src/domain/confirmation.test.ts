import { describe, expect, it } from "vitest";
import { applyConfirmationAction, ConfirmationError } from "./confirmation";
import type { ConfirmationAction } from "./appointment";

describe("applyConfirmationAction", () => {
  it('mapeia SIM a partir de pendente para "confirmado"', () => {
    expect(applyConfirmationAction("pendente", "SIM")).toBe("confirmado");
  });

  it('mapeia NAO a partir de pendente para "liberado"', () => {
    expect(applyConfirmationAction("pendente", "NAO")).toBe("liberado");
  });

  it('mapeia REMARCAR a partir de pendente para "remarcacao_solicitada"', () => {
    expect(applyConfirmationAction("pendente", "REMARCAR")).toBe(
      "remarcacao_solicitada",
    );
  });

  it.each(["confirmado", "liberado", "remarcacao_solicitada"] as const)(
    "rejeita ação quando status já é %s",
    (status) => {
      expect(() => applyConfirmationAction(status, "SIM")).toThrow(
        ConfirmationError,
      );
      try {
        applyConfirmationAction(status, "SIM");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfirmationError);
        expect((error as ConfirmationError).code).toBe("NOT_PENDING");
      }
    },
  );

  it("rejeita ação inválida", () => {
    const invalid = "TALVEZ" as ConfirmationAction;
    expect(() => applyConfirmationAction("pendente", invalid)).toThrow(
      ConfirmationError,
    );
    try {
      applyConfirmationAction("pendente", invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfirmationError);
      expect((error as ConfirmationError).code).toBe("INVALID_ACTION");
    }
  });
});
