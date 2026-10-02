import { describe, expect, it } from "vitest";
import { Pool } from "pg";
import { buildAuthOptions } from "./server";

const ENV = {
  databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  secret: "x".repeat(32),
};

describe("buildAuthOptions", () => {
  const pool = new Pool({ connectionString: ENV.databaseUrl });

  it("bloqueia cadastro público no app", () => {
    const options = buildAuthOptions({ allowSignUp: false, env: ENV, pool });
    expect(options.emailAndPassword).toEqual({
      enabled: true,
      disableSignUp: true,
    });
  });

  it("libera cadastro apenas quando pedido (script de criação de usuário)", () => {
    const options = buildAuthOptions({ allowSignUp: true, env: ENV, pool });
    expect(options.emailAndPassword.disableSignUp).toBe(false);
  });

  it("usa as tabelas auth_* da migration", () => {
    const options = buildAuthOptions({ allowSignUp: false, env: ENV, pool });
    expect(options.user.modelName).toBe("auth_user");
    expect(options.session.modelName).toBe("auth_session");
    expect(options.account.modelName).toBe("auth_account");
    expect(options.verification.modelName).toBe("auth_verification");
  });
});
