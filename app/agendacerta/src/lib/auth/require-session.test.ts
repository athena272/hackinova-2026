import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthConfigError } from "./env";

const getSession = vi.fn();

vi.mock("./server", () => ({
  getAuth: vi.fn(() => ({ api: { getSession } })),
}));

import { getAuth } from "./server";
import {
  AUTH_UNAVAILABLE_MESSAGE,
  requireClinicSession,
  resolveClinicSession,
  SESSION_EXPIRED_MESSAGE,
} from "./require-session";

const SESSION = {
  session: { id: "ses-1", userId: "usr-1" },
  user: { id: "usr-1", email: "clinica@exemplo.com" },
};

function request(): Request {
  return new Request("http://localhost/api/appointments", {
    headers: { cookie: "better-auth.session_token=abc" },
  });
}

describe("requireClinicSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("libera a rota quando a sessão é válida e repassa os headers", async () => {
    getSession.mockResolvedValue(SESSION);

    const result = await requireClinicSession(request());

    expect(result).toEqual({ ok: true, session: SESSION });
    const [{ headers }] = getSession.mock.calls[0];
    expect(headers.get("cookie")).toBe("better-auth.session_token=abc");
  });

  it("responde 401 em JSON quando não há sessão", async () => {
    getSession.mockResolvedValue(null);

    const result = await requireClinicSession(request());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({
      error: SESSION_EXPIRED_MESSAGE,
    });
  });

  it("responde 503 quando a autenticação não está configurada", async () => {
    vi.mocked(getAuth).mockImplementationOnce(() => {
      throw new AuthConfigError("Autenticação não configurada: defina DATABASE_URL.");
    });

    const result = await requireClinicSession(request());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(503);
    await expect(result.response.json()).resolves.toEqual({
      error: AUTH_UNAVAILABLE_MESSAGE,
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("responde 503 e registra o erro quando o banco falha", async () => {
    getSession.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const result = await requireClinicSession(request());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(503);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("resolveClinicSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("diferencia autenticado de anônimo", async () => {
    getSession.mockResolvedValueOnce(SESSION).mockResolvedValueOnce(null);

    await expect(resolveClinicSession(new Headers())).resolves.toEqual({
      status: "authenticated",
      session: SESSION,
    });
    await expect(resolveClinicSession(new Headers())).resolves.toEqual({
      status: "anonymous",
    });
  });
});
