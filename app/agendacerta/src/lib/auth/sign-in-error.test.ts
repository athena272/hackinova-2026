import { describe, expect, it } from "vitest";
import { describeSignInError, SIGN_IN_MESSAGES } from "./sign-in-error";

describe("describeSignInError", () => {
  it("credenciais inválidas pelo code ou status 401", () => {
    expect(describeSignInError({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      SIGN_IN_MESSAGES.invalidCredentials,
    );
    expect(describeSignInError({ status: 401 })).toBe(
      SIGN_IN_MESSAGES.invalidCredentials,
    );
  });

  it("limite de tentativas", () => {
    expect(describeSignInError({ status: 429 })).toBe(SIGN_IN_MESSAGES.tooManyAttempts);
  });

  it.each([500, 503])("servidor indisponível (%i)", (status) => {
    expect(describeSignInError({ status })).toBe(SIGN_IN_MESSAGES.unavailable);
  });

  it("falha de rede", () => {
    expect(describeSignInError({ status: 0 })).toBe(SIGN_IN_MESSAGES.network);
  });

  it("mensagem genérica para o resto", () => {
    expect(describeSignInError({ status: 400 })).toBe(SIGN_IN_MESSAGES.generic);
    expect(describeSignInError({})).toBe(SIGN_IN_MESSAGES.generic);
  });
});
