import { describe, expect, it } from "vitest";
import { InvalidProcedureError } from "@/domain/appointment";
import {
  type AppointmentRecord,
  mapRecordToAppointment,
  mapRecordToWaitlistEntry,
  type WaitlistRecord,
} from "./mappers";

const patient = {
  id: "pat-demo-01",
  fullName: "Lucas Ferreira",
  phoneMasked: "(79) 9****-8181",
};

const consultaRecord: AppointmentRecord = {
  id: "apt-001",
  specialty: "Neurologia",
  scheduledAt: new Date("2026-09-22T12:00:00.000Z"),
  bookedAt: new Date("2026-08-13T12:00:00.000Z"),
  status: "pendente",
  procedureType: "consulta",
  procedureName: null,
  preparationResult: null,
  preparationAnsweredAt: null,
  preparationMissedItemIds: [],
  patient,
};

describe("mapRecordToAppointment", () => {
  it("achata o paciente aninhado no formato que a API já devolvia", () => {
    expect(mapRecordToAppointment(consultaRecord)).toEqual({
      id: "apt-001",
      patientId: "pat-demo-01",
      patientName: "Lucas Ferreira",
      specialty: "Neurologia",
      scheduledAt: "2026-09-22T12:00:00.000Z",
      bookedAt: "2026-08-13T12:00:00.000Z",
      status: "pendente",
      phoneMasked: "(79) 9****-8181",
      procedure: { type: "consulta" },
      preparation: null,
    });
  });

  it("monta a resposta do preparo com a data em ISO", () => {
    const appointment = mapRecordToAppointment({
      ...consultaRecord,
      procedureType: "exame",
      procedureName: "Glicemia em jejum",
      preparationResult: "nao_cumprido",
      preparationAnsweredAt: new Date("2026-09-23T21:00:00.000Z"),
      preparationMissedItemIds: ["prep-glicemia-jejum-jejum"],
    });

    expect(appointment.preparation).toEqual({
      result: "nao_cumprido",
      missedItemIds: ["prep-glicemia-jejum-jejum"],
      answeredAt: "2026-09-23T21:00:00.000Z",
    });
  });

  it("mapeia exame com o nome do procedimento", () => {
    const appointment = mapRecordToAppointment({
      ...consultaRecord,
      procedureType: "exame",
      procedureName: "Glicemia em jejum",
    });

    expect(appointment.procedure).toEqual({
      type: "exame",
      examName: "Glicemia em jejum",
    });
  });

  it("recusa exame sem nome em vez de devolver dado inconsistente", () => {
    expect(() =>
      mapRecordToAppointment({ ...consultaRecord, procedureType: "exame" }),
    ).toThrow(InvalidProcedureError);
  });
});

describe("mapRecordToWaitlistEntry", () => {
  it("achata o paciente aninhado", () => {
    const record: WaitlistRecord = {
      id: "wl-001",
      specialty: "Laboratório",
      status: "aguardando",
      patient,
    };

    expect(mapRecordToWaitlistEntry(record)).toEqual({
      id: "wl-001",
      patientId: "pat-demo-01",
      patientName: "Lucas Ferreira",
      specialty: "Laboratório",
      phoneMasked: "(79) 9****-8181",
      status: "aguardando",
    });
  });
});
