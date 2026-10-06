import { describe, expect, it } from "vitest";
import type { Appointment, AppointmentStatus } from "./appointment";
import { countByStatus, splitAgendaAndHistory } from "./appointment-summary";

function appointment(
  id: string,
  status: AppointmentStatus,
  scheduledAt: string,
): Appointment {
  return {
    id,
    patientId: `pat-${id}`,
    patientName: `Paciente ${id}`,
    specialty: "Neurologia",
    scheduledAt,
    status,
    phoneMasked: "(79) 9****-0000",
    procedure: { type: "consulta" },
  };
}

describe("splitAgendaAndHistory", () => {
  const list = [
    appointment("a2", "pendente", "2026-09-23T11:00:00-03:00"),
    appointment("h1", "faltou", "2026-06-10T09:00:00-03:00"),
    appointment("a1", "liberado", "2026-09-22T09:00:00-03:00"),
    appointment("h2", "compareceu", "2026-08-19T10:00:00-03:00"),
  ];

  it("agenda fica em ordem crescente e histórico do mais recente para o mais antigo", () => {
    const { agenda, history } = splitAgendaAndHistory(list);

    expect(agenda.map((item) => item.id)).toEqual(["a1", "a2"]);
    expect(history.map((item) => item.id)).toEqual(["h2", "h1"]);
  });

  it("ordena por instante mesmo com offsets diferentes (seed -03:00 e banco em UTC)", () => {
    const { agenda } = splitAgendaAndHistory([
      appointment("tarde", "pendente", "2026-09-22T13:00:00.000Z"),
      appointment("manha", "pendente", "2026-09-22T09:00:00-03:00"),
    ]);

    expect(agenda.map((item) => item.id)).toEqual(["manha", "tarde"]);
  });

  it("não altera a lista recebida", () => {
    const copy = [...list];
    splitAgendaAndHistory(list);
    expect(list).toEqual(copy);
  });

  it("devolve listas vazias quando não há agendamentos", () => {
    expect(splitAgendaAndHistory([])).toEqual({ agenda: [], history: [] });
  });
});

describe("countByStatus", () => {
  it("conta todos os status, inclusive os que não aparecem", () => {
    const counts = countByStatus([
      appointment("1", "pendente", "2026-09-22T09:00:00-03:00"),
      appointment("2", "pendente", "2026-09-22T10:00:00-03:00"),
      appointment("3", "faltou", "2026-06-10T09:00:00-03:00"),
    ]);

    expect(counts).toEqual({
      pendente: 2,
      confirmado: 0,
      liberado: 0,
      remarcacao_solicitada: 0,
      compareceu: 0,
      faltou: 1,
    });
  });
});
