import { describe, expect, it } from "vitest";
import { readClinicUserInput } from "./clinic-user-input";

describe("readClinicUserInput", () => {
  it("normaliza e-mail e usa nome padrão", () => {
    expect(
      readClinicUserInput({
        CLINIC_USER_EMAIL: "  Clinica@Exemplo.com ",
        CLINIC_USER_PASSWORD: "senha-forte-1",
      }),
    ).toEqual({
      email: "clinica@exemplo.com",
      password: "senha-forte-1",
      name: "Clínica",
    });
  });

  it("usa CLINIC_USER_NAME quando informado", () => {
    expect(
      readClinicUserInput({
        CLINIC_USER_EMAIL: "clinica@exemplo.com",
        CLINIC_USER_PASSWORD: "senha-forte-1",
        CLINIC_USER_NAME: "Clínica Aracaju",
      }).name,
    ).toBe("Clínica Aracaju");
  });

  it("exige e-mail e senha", () => {
    expect(() => readClinicUserInput({})).toThrow(/CLINIC_USER_EMAIL e CLINIC_USER_PASSWORD/);
  });

  it("rejeita e-mail inválido", () => {
    expect(() =>
      readClinicUserInput({
        CLINIC_USER_EMAIL: "clinica",
        CLINIC_USER_PASSWORD: "senha-forte-1",
      }),
    ).toThrow(/inválido/);
  });

  it("rejeita senha curta", () => {
    expect(() =>
      readClinicUserInput({
        CLINIC_USER_EMAIL: "clinica@exemplo.com",
        CLINIC_USER_PASSWORD: "123",
      }),
    ).toThrow(/pelo menos 8/);
  });
});
