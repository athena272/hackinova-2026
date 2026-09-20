import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SupabaseAppointmentRepository } from "./supabase-appointment-repository";

describe("SupabaseAppointmentRepository.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propaga permission denied enriquecido quando falta GRANT", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "permission denied for table appointments" },
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const repo = new SupabaseAppointmentRepository();

    await expect(repo.list()).rejects.toThrow(
      /Falha ao listar agendamentos: permission denied for table appointments/,
    );
    await expect(repo.list()).rejects.toThrow(/GRANT ao service_role/i);
  });
});
