export type ClinicUserInput = {
  email: string;
  password: string;
  name: string;
};

/** Mesmo mínimo padrão do Better Auth para email/senha. */
export const MIN_CLINIC_PASSWORD_LENGTH = 8;
const DEFAULT_CLINIC_NAME = "Clínica";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lê e valida as credenciais do usuário da clínica (script auth:create-user). */
export function readClinicUserInput(
  env: Record<string, string | undefined>,
): ClinicUserInput {
  const email = env.CLINIC_USER_EMAIL?.trim().toLowerCase();
  const password = env.CLINIC_USER_PASSWORD ?? "";
  const name = env.CLINIC_USER_NAME?.trim() || DEFAULT_CLINIC_NAME;

  if (!email || !password) {
    throw new Error(
      "Defina CLINIC_USER_EMAIL e CLINIC_USER_PASSWORD (no .env.local ou na linha de comando).",
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error(`CLINIC_USER_EMAIL inválido: ${email}`);
  }
  if (password.length < MIN_CLINIC_PASSWORD_LENGTH) {
    throw new Error(
      `CLINIC_USER_PASSWORD precisa ter pelo menos ${MIN_CLINIC_PASSWORD_LENGTH} caracteres.`,
    );
  }

  return { email, password, name };
}
