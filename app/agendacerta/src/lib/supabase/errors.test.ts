import { describe, expect, it } from "vitest";
import {
  enrichDataApiErrorMessage,
  formatListAppointmentsError,
} from "./errors";

describe("enrichDataApiErrorMessage", () => {
  it("enriquece permission denied for table appointments (regressão Vercel)", () => {
    const raw = "permission denied for table appointments";
    const enriched = enrichDataApiErrorMessage(raw);

    expect(enriched).toContain(raw);
    expect(enriched).toMatch(/GRANT ao service_role/i);
    expect(enriched).toMatch(/SUPABASE_SERVICE_ROLE_KEY/i);
  });

  it("não altera outras mensagens da Data API", () => {
    const raw = "relation \"appointments\" does not exist";
    expect(enrichDataApiErrorMessage(raw)).toBe(raw);
  });
});

describe("formatListAppointmentsError", () => {
  it("prefixa e enriquece o erro de listagem por falta de GRANT", () => {
    const message = formatListAppointmentsError(
      "permission denied for table appointments",
    );

    expect(message).toMatch(/^Falha ao listar agendamentos:/);
    expect(message).toContain("permission denied for table appointments");
    expect(message).toMatch(/GRANT ao service_role/i);
  });
});
