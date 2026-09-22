import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WaitlistEntry } from "@/domain/waitlist";
import type { WaitlistRepository } from "@/repository/waitlist-repository";

vi.mock("@/repository/create-waitlist-repository", () => ({
  createWaitlistRepository: vi.fn(),
}));

import { createWaitlistRepository } from "@/repository/create-waitlist-repository";
import { GET } from "./route";

function mockRepo(
  partial: Partial<WaitlistRepository>,
): WaitlistRepository {
  return {
    listBySpecialty: vi.fn(),
    getById: vi.fn(),
    saveAssigned: vi.fn(),
    ...partial,
  };
}

describe("GET /api/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("exige specialty na query", async () => {
    const response = await GET(
      new Request("http://localhost/api/waitlist"),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Informe a especialidade via ?specialty=...",
    });
  });

  it("lista candidatos aguardando da especialidade", async () => {
    const entries: WaitlistEntry[] = [
      {
        id: "wl-001",
        patientName: "Helena Dias",
        specialty: "Neurologia",
        phoneMasked: "(79) 9****-4444",
        status: "aguardando",
      },
    ];
    vi.mocked(createWaitlistRepository).mockReturnValue(
      mockRepo({
        listBySpecialty: vi.fn().mockResolvedValue(entries),
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/waitlist?specialty=Neurologia"),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ entries });
  });
});
