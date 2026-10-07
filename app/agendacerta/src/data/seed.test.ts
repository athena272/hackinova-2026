import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import rawAppointments from "../../data/appointments.seed.json";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import { isActiveBooking, isAttendanceOutcome } from "@/domain/appointment";
import { findExamPreparation } from "@/domain/exam-preparation";
import { loadClinicUnitSeed } from "./clinic-unit-seed";
import { loadExamPreparationSeed } from "./exam-preparation-seed";
import { loadNeighborhoodSeed, loadPatientSeed } from "./patient-seed";
import { loadAppointmentSeed } from "./seed";
import { loadWaitlistSeed } from "./waitlist-seed";

/**
 * O seed em memória (CI, testes, deploy sem banco) precisa espelhar as migrations.
 * Estes testes acusam referência quebrada ou divergência entre JSON e SQL.
 */
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n");

const appointments = loadAppointmentSeed();
const waitlist = loadWaitlistSeed();
const patients = loadPatientSeed();
const neighborhoods = loadNeighborhoodSeed();
const preparations = loadExamPreparationSeed();
const clinicUnits = loadClinicUnitSeed();
const DUPLICATE_DEMO_MIGRATION = "20261010120200_seed_duplicate_booking_demo.sql";

const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);
const sorted = (values: Iterable<string>) => Array.from(values).sort();

describe("seed em memória", () => {
  it.each([
    ["agendamentos", ids(appointments)],
    ["lista de espera", ids(waitlist)],
    ["pacientes", ids(patients)],
    ["bairros", ids(neighborhoods)],
    ["preparos", ids(preparations)],
    ["unidades", ids(clinicUnits)],
    ["itens de preparo", preparations.flatMap((preparation) => ids(preparation.items))],
  ])("não repete ids de %s", (_, values) => {
    expect(new Set(values).size).toBe(values.length);
  });

  it("todo paciente aponta para um bairro existente, e a clínica e as unidades também", () => {
    const neighborhoodIds = new Set(ids(neighborhoods));

    expect(neighborhoodIds.has(CLINIC_NEIGHBORHOOD_ID)).toBe(true);
    for (const unit of clinicUnits) {
      if (unit.neighborhoodId !== null) {
        expect(neighborhoodIds.has(unit.neighborhoodId), unit.id).toBe(true);
      }
    }
    for (const patient of patients) {
      if (patient.neighborhoodId !== null) {
        expect(neighborhoodIds.has(patient.neighborhoodId), patient.id).toBe(true);
      }
    }
  });

  it("preserva os agendamentos e a lista de espera de antes, com os mesmos status", () => {
    const statusById = Object.fromEntries(
      appointments.map((item) => [item.id, item.status]),
    );

    expect(statusById).toMatchObject({
      "apt-001": "pendente",
      "apt-002": "pendente",
      "apt-003": "pendente",
      "apt-004": "confirmado",
      "apt-005": "pendente",
      "apt-006": "liberado",
    });
    expect(
      waitlist.map(({ id, patientName, status }) => ({ id, patientName, status })),
    ).toEqual([
      { id: "wl-001", patientName: "Helena Dias", status: "aguardando" },
      { id: "wl-002", patientName: "Igor Santos", status: "aguardando" },
      { id: "wl-003", patientName: "Juliana Prado", status: "aguardando" },
      { id: "wl-004", patientName: "Karen Oliveira", status: "aguardando" },
      { id: "wl-005", patientName: "Nelson Araújo", status: "aguardando" },
      { id: "wl-006", patientName: "Olívia Martins", status: "aguardando" },
      { id: "wl-007", patientName: "Lucas Ferreira", status: "aguardando" },
      { id: "wl-008", patientName: "Elena Rocha", status: "aguardando" },
    ]);
  });

  it("histórico de comparecimento é anterior a toda a agenda ativa", () => {
    const history = appointments.filter((item) => isAttendanceOutcome(item.status));
    const agenda = appointments.filter((item) => !isAttendanceOutcome(item.status));
    const latestHistory = Math.max(...history.map((item) => Date.parse(item.scheduledAt)));
    const earliestAgenda = Math.min(...agenda.map((item) => Date.parse(item.scheduledAt)));

    expect(history.length).toBeGreaterThan(0);
    expect(latestHistory).toBeLessThan(earliestAgenda);
  });

  it("tem perfis faltosos e assíduos para o score usar", () => {
    const noShowsByPatient = new Map<string, number>();
    for (const item of appointments) {
      if (item.status === "faltou") {
        noShowsByPatient.set(item.patientId, (noShowsByPatient.get(item.patientId) ?? 0) + 1);
      }
    }
    const withHistory = new Set(
      appointments.filter((item) => isAttendanceOutcome(item.status)).map((item) => item.patientId),
    );

    expect(Math.max(...noShowsByPatient.values())).toBeGreaterThanOrEqual(2);
    expect([...withHistory].some((id) => !noShowsByPatient.has(id))).toBe(true);
  });

  it("toda consulta foi marcada antes do horário (mesma regra da check constraint)", () => {
    for (const item of appointments) {
      expect(Date.parse(item.bookedAt), item.id).not.toBeNaN();
      expect(Date.parse(item.bookedAt), item.id).toBeLessThanOrEqual(
        Date.parse(item.scheduledAt),
      );
    }
  });

  it("exame sempre tem nome e consulta nunca tem (mesma regra da check constraint)", () => {
    for (const item of rawAppointments) {
      expect(item.procedureType === "exame", item.id).toBe(
        typeof item.procedureName === "string" && item.procedureName.trim() !== "",
      );
    }
  });

  it("todo preparo cadastrado tem exame na agenda ativa para a demonstração", () => {
    const activeExamNames = new Set(
      appointments
        .filter((item) => isActiveBooking(item.status) && item.procedure.type === "exame")
        .map((item) => (item.procedure.type === "exame" ? item.procedure.examName : "")),
    );

    for (const preparation of preparations) {
      expect(activeExamNames.has(preparation.examName), preparation.examName).toBe(true);
    }
  });

  it("itens de cada preparo estão em ordem, com posições 1, 2, ...", () => {
    for (const preparation of preparations) {
      expect(preparation.items.map((item) => item.position), preparation.id).toEqual(
        preparation.items.map((_, index) => index + 1),
      );
    }
  });

  it("resposta de preparo gravada segue as check constraints e cita itens do próprio exame", () => {
    for (const item of appointments.filter((appointment) => appointment.preparation)) {
      const answer = item.preparation!;
      const preparation = findExamPreparation(item.procedure, preparations);

      expect(preparation, item.id).not.toBeNull();
      expect(Date.parse(answer.answeredAt), item.id).not.toBeNaN();
      expect(answer.result === "nao_cumprido", item.id).toBe(answer.missedItemIds.length > 0);
      const itemIds = new Set(ids(preparation!.items));
      for (const missedId of answer.missedItemIds) {
        expect(itemIds.has(missedId), `${item.id}: ${missedId}`).toBe(true);
      }
    }
  });
});

describe("seed em memória x migrations", () => {
  it("pacientes vindos do backfill usam o mesmo id determinístico da migration", () => {
    for (const patient of patients.filter((item) => !item.id.startsWith("pat-demo-"))) {
      const hash = createHash("md5")
        .update(`${patient.fullName}|${patient.phoneMasked}`, "utf8")
        .digest("hex")
        .slice(0, 12);
      expect(patient.id, patient.fullName).toBe(`pat-${hash}`);
    }
  });

  it("agendamentos e lista de espera têm os mesmos ids nos dois seeds", () => {
    const sqlAppointmentIds = new Set(
      Array.from(migrations.matchAll(/'((?:apt|hist)-\d+)'/g), ([, id]) => id),
    );
    const sqlWaitlistIds = new Set(
      Array.from(migrations.matchAll(/'(wl-\d+)'/g), ([, id]) => id),
    );

    expect(sorted(ids(appointments))).toEqual(sorted(sqlAppointmentIds));
    expect(sorted(ids(waitlist))).toEqual(sorted(sqlWaitlistIds));
  });

  it("pacientes de demonstração existem na migration com o mesmo nome e bairro", () => {
    for (const patient of patients.filter((item) => item.id.startsWith("pat-demo-"))) {
      expect(migrations).toContain(
        `('${patient.id}', '${patient.fullName}', '${patient.phoneMasked}', '${patient.neighborhoodId}')`,
      );
    }
  });

  it("bairros têm os mesmos dados e coordenadas nos dois seeds", () => {
    const sqlNeighborhoods = Array.from(
      migrations.matchAll(
        /\('(nb-[\w-]+)', '([^']+)', '([^']+)', (-?\d+\.\d+), (-?\d+\.\d+)\)/g,
      ),
      ([, id, name, city, latitude, longitude]) => ({
        id,
        name,
        city,
        latitude: Number(latitude),
        longitude: Number(longitude),
      }),
    );

    expect(sqlNeighborhoods).toEqual(neighborhoods);
  });

  it("antecedência de cada agendamento é a mesma no JSON e nas migrations de booked_at", () => {
    const bookedAtSql = ["20261006130000_appointments_booked_at.sql", DUPLICATE_DEMO_MIGRATION]
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n");
    const sqlLeadDays = Object.fromEntries(
      Array.from(
        bookedAtSql.matchAll(/\('((?:apt|hist)-\d+)', (\d+)\)/g),
        ([, id, days]) => [id, Number(days)],
      ),
    );
    const jsonLeadDays = Object.fromEntries(
      appointments.map((item) => [
        item.id,
        (Date.parse(item.scheduledAt) - Date.parse(item.bookedAt)) / (24 * 60 * 60 * 1000),
      ]),
    );

    expect(jsonLeadDays).toEqual(sqlLeadDays);
  });

  it("entrada na lista de espera é a mesma no JSON e na migration da oferta em cascata", () => {
    const slotOfferSql = readFileSync(
      join(migrationsDir, "20261008120100_seed_slot_offer_demo.sql"),
      "utf8",
    );
    const sqlRequestedAt = Object.fromEntries(
      Array.from(
        slotOfferSql.matchAll(/\('(wl-\d+)', '(\d{4}-\d{2}-\d{2}T[^']+)'\)/g),
        ([, id, requestedAt]) => [id, Date.parse(requestedAt)],
      ),
    );
    const jsonRequestedAt = Object.fromEntries(
      waitlist.map((item) => [item.id, Date.parse(item.requestedAt)]),
    );

    expect(jsonRequestedAt).toEqual(sqlRequestedAt);
  });

  describe("booking duplo", () => {
    const duplicateSql = readFileSync(join(migrationsDir, DUPLICATE_DEMO_MIGRATION), "utf8");

    it("unidades têm os mesmos dados nos dois seeds", () => {
      const sqlUnits = Array.from(
        duplicateSql.matchAll(/\('(unit-[\w-]+)', '([^']+)', '(nb-[\w-]+)'\)/g),
        ([, id, name, neighborhoodId]) => ({ id, name, neighborhoodId }),
      );

      expect(sqlUnits).toEqual(clinicUnits);
    });

    it("unidade de cada agendamento é a mesma no JSON e na migration", () => {
      const sqlUnitById = Object.fromEntries(
        Array.from(
          duplicateSql.matchAll(/\('((?:apt|hist)-\d+)', '(unit-[\w-]+)'\)/g),
          ([, id, unitId]) => [id, unitId],
        ),
      );
      const jsonUnitById = Object.fromEntries(
        appointments.filter((item) => item.unit).map((item) => [item.id, item.unit!.id]),
      );

      expect(Object.keys(jsonUnitById).length).toBeGreaterThan(0);
      expect(jsonUnitById).toEqual(sqlUnitById);
    });

    it("vínculos de retorno são os mesmos no JSON e na migration", () => {
      const sqlReturns = Array.from(
        duplicateSql.matchAll(
          /set return_of_appointment_id = '((?:apt|hist)-\d+)'\s+where id = '((?:apt|hist)-\d+)'/g,
        ),
        ([, originId, id]) => ({ id, originId }),
      );
      const jsonReturns = appointments
        .filter((item) => item.returnOfAppointmentId)
        .map((item) => ({ id: item.id, originId: item.returnOfAppointmentId! }));

      expect(jsonReturns.length).toBeGreaterThan(0);
      expect(jsonReturns).toEqual(sqlReturns);
    });

    it("todo retorno aponta para outro agendamento do mesmo paciente e especialidade", () => {
      const byId = new Map(appointments.map((item) => [item.id, item]));
      for (const item of appointments.filter((appointment) => appointment.returnOfAppointmentId)) {
        const origin = byId.get(item.returnOfAppointmentId!);
        expect(origin, item.id).toBeDefined();
        expect(origin!.id, item.id).not.toBe(item.id);
        expect(origin!.patientId, item.id).toBe(item.patientId);
        expect(origin!.specialty, item.id).toBe(item.specialty);
      }
    });
  });

  describe("preparo de exames", () => {
    const preparationSql = readFileSync(
      join(migrationsDir, "20261007120100_seed_exam_preparations.sql"),
      "utf8",
    );

    it("preparos e itens têm os mesmos dados nos dois seeds", () => {
      const sqlPreparations = Array.from(
        preparationSql.matchAll(/\('(prep-[\w-]+)', '([^']+)', '([^']+)'\)/g),
        ([, id, examName, instructions]) => ({ id, examName, instructions }),
      );
      const sqlItems = Array.from(
        preparationSql.matchAll(
          /\('(prep-[\w-]+)', '(prep-[\w-]+)', (\d+), '([^']+)', '([^']+)'\)/g,
        ),
        ([, id, preparationId, position, label, question]) => ({
          id,
          preparationId,
          position: Number(position),
          label,
          question,
        }),
      );

      expect(
        preparations.map(({ id, examName, instructions }) => ({ id, examName, instructions })),
      ).toEqual(sqlPreparations);
      expect(
        preparations.flatMap((preparation) =>
          preparation.items.map((item) => ({ ...item, preparationId: preparation.id })),
        ),
      ).toEqual(sqlItems);
    });

    it("respostas já gravadas são as mesmas nos dois seeds", () => {
      const sqlAnswers = Array.from(
        preparationSql.matchAll(
          /set preparation_result = '(\w+)',\s+preparation_answered_at = '([^']+)'\s+where id = '(apt-\d+)'/g,
        ),
        ([, result, answeredAt, id]) => ({ id, result, answeredAt: Date.parse(answeredAt) }),
      );
      const jsonAnswers = appointments
        .filter((item) => item.preparation)
        .map((item) => ({
          id: item.id,
          result: item.preparation!.result,
          answeredAt: Date.parse(item.preparation!.answeredAt),
        }));

      expect(sqlAnswers.length).toBeGreaterThan(0);
      expect(jsonAnswers).toEqual(sqlAnswers);
    });
  });
});
