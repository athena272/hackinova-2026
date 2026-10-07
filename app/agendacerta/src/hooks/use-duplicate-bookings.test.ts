import { describe, expect, it, vi } from "vitest";
import {
  booking,
  openCheck,
  resolvedCheck,
  september,
} from "@/domain/duplicate-booking/duplicate-booking.test-utils";
import {
  chooseDuplicateBooking,
  fetchDuplicateBookings,
  sendDuplicateCheck,
} from "./use-duplicate-bookings";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const overview = {
  alerts: [],
  flaggedAppointmentIds: ["apt-002", "apt-009"],
  releasedAppointmentIds: ["apt-004"],
};

describe("fetchDuplicateBookings", () => {
  it("devolve alertas, sinalizados e liberados da API", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(overview));

    await expect(fetchDuplicateBookings(fetcher)).resolves.toEqual(overview);
    expect(fetcher).toHaveBeenCalledWith("/api/duplicate-bookings", { cache: "no-store" });
  });

  it("usa a mensagem da API e falha com clareza quando falta algum campo", async () => {
    const failing = vi.fn().mockResolvedValue(jsonResponse({ error: "Sem sessão." }, 401));
    const partial = vi.fn().mockResolvedValue(jsonResponse({ alerts: [] }));

    await expect(fetchDuplicateBookings(failing)).rejects.toThrow("Sem sessão.");
    await expect(fetchDuplicateBookings(partial)).rejects.toThrow(
      "Falha ao carregar as possíveis duplicidades.",
    );
  });
});

describe("sendDuplicateCheck", () => {
  it("envia os horários do grupo e devolve a confirmação aguardando", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ check: openCheck() }, 201));

    await expect(sendDuplicateCheck(["apt-a", "apt-b"], fetcher)).resolves.toEqual(openCheck());
    expect(fetcher).toHaveBeenCalledWith(
      "/api/duplicate-bookings",
      expect.objectContaining({ method: "POST", body: '{"appointmentIds":["apt-a","apt-b"]}' }),
    );
  });

  it("mostra o motivo quando a confirmação já foi enviada", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Já enviada.", code: "ALREADY_SENT" }, 400));

    await expect(sendDuplicateCheck(["apt-a", "apt-b"], fetcher)).rejects.toThrow("Já enviada.");
  });
});

describe("chooseDuplicateBooking", () => {
  it("envia o horário mantido para a confirmação", async () => {
    const result = {
      check: resolvedCheck(),
      kept: booking({ status: "confirmado" }),
      released: [booking({ id: "apt-b", scheduledAt: september(24), status: "liberado" })],
    };
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(result));

    await expect(chooseDuplicateBooking("dup-1", "apt-a", fetcher)).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/duplicate-bookings/dup-1/choice",
      expect.objectContaining({ method: "POST", body: '{"keepAppointmentId":"apt-a"}' }),
    );
  });

  it("mostra o motivo do conflito quando outra resposta chegou antes", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ error: "Acabou de ser respondida.", code: "DUPLICATE_CHECK_CONFLICT" }, 409),
    );

    await expect(chooseDuplicateBooking("dup-1", "apt-a", fetcher)).rejects.toThrow(
      "Acabou de ser respondida.",
    );
  });
});
