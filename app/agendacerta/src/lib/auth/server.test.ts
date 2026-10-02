import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { AuthConfigError } from "./env";
import { buildAuthOptions } from "./server";

const ENV = {
  databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  secret: "x".repeat(32),
};

describe("buildAuthOptions", () => {
  const prisma = {} as PrismaClient;

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bloqueia cadastro público no app", () => {
    const options = buildAuthOptions({ allowSignUp: false, env: ENV, prisma });
    expect(options.emailAndPassword).toEqual({
      enabled: true,
      disableSignUp: true,
    });
  });

  it("libera cadastro apenas quando pedido (script de criação de usuário)", () => {
    const options = buildAuthOptions({ allowSignUp: true, env: ENV, prisma });
    expect(options.emailAndPassword.disableSignUp).toBe(false);
  });

  it("usa as tabelas auth_* da migration", () => {
    const options = buildAuthOptions({ allowSignUp: false, env: ENV, prisma });
    expect(options.user.modelName).toBe("auth_user");
    expect(options.session.modelName).toBe("auth_session");
    expect(options.account.modelName).toBe("auth_account");
    expect(options.verification.modelName).toBe("auth_verification");
  });

  it("usa o adapter do Prisma como banco", () => {
    const options = buildAuthOptions({ allowSignUp: false, env: ENV, prisma });
    expect(options.database).toBeTypeOf("function");
  });

  it("sem DATABASE_URL lança AuthConfigError antes de criar o Prisma (rotas respondem 503)", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", ENV.secret);

    expect(() => buildAuthOptions({ allowSignUp: false })).toThrow(
      AuthConfigError,
    );
  });
});
