import { describe, expect, it } from "vitest";
import {
  assertCanOverbook,
  blockKey,
  coveredAppointmentIds,
  createEncaixe,
  findOverbookingOpportunities,
  findOverbookingSuggestions,
  groupByBlock,
  isOverbookingDecisionInput,
  isSlotCoveredByOverbooking,
  MAX_OVERBOOKINGS_PER_BLOCK,
  OverbookingError,
  pickEncaixeCandidate,
  refuseOverbooking,
  slotBlockOf,
} from ".";
import {
  accepted,
  appointment,
  DECIDED_AT,
  refused,
  risk,
  risksOf,
  SLOT_AT,
  waitingCandidate,
} from "./overbooking.test-utils";

function expectOverbookingError(run: () => unknown, code: OverbookingError["code"]) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(OverbookingError);
    expect((error as OverbookingError).code).toBe(code);
    return;
  }
  throw new Error(`Esperava OverbookingError ${code}`);
}

describe("blocos", () => {
  it("compara o instante, não o texto do horário", () => {
    expect(blockKey("Neurologia", "2026-09-22T09:00:00-03:00")).toBe(
      blockKey("Neurologia", "2026-09-22T12:00:00.000Z"),
    );
  });

  it("separa especialidades diferentes no mesmo horário", () => {
    expect(blockKey("Neurologia", SLOT_AT)).not.toBe(blockKey("Oftalmologia", SLOT_AT));
  });

  it("agrupa agendamentos do mesmo bloco mesmo com offsets diferentes", () => {
    const groups = groupByBlock([
      appointment({ id: "a", scheduledAt: "2026-09-22T09:00:00-03:00" }),
      appointment({ id: "b", scheduledAt: SLOT_AT }),
      appointment({ id: "c", scheduledAt: "2026-09-23T14:00:00.000Z" }),
    ]);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([["a", "b"], ["c"]]);
    expect(groups[0].block).toEqual(slotBlockOf(appointment({ scheduledAt: "2026-09-22T09:00:00-03:00" })));
  });
});

describe("findOverbookingOpportunities", () => {
  it("sugere encaixe no bloco com agendamento de risco alto", () => {
    const anchor = appointment();
    const [opportunity, ...rest] = findOverbookingOpportunities({
      appointments: [anchor],
      risksById: risksOf(risk("apt-001", "alto")),
      overbookings: [],
    });
    expect(rest).toEqual([]);
    expect(opportunity.anchor.id).toBe("apt-001");
    expect(opportunity.risk.reasons[0].description).toContain("Faltou");
    expect(opportunity.acceptedCount).toBe(0);
    expect(opportunity.limit).toBe(MAX_OVERBOOKINGS_PER_BLOCK);
  });

  it.each(["baixo", "medio"] as const)("não sugere nada para risco %s", (band) => {
    expect(
      findOverbookingOpportunities({
        appointments: [appointment()],
        risksById: risksOf(risk("apt-001", band)),
        overbookings: [],
      }),
    ).toEqual([]);
  });

  it("não sugere quando o agendamento de risco alto não está ativo", () => {
    expect(
      findOverbookingOpportunities({
        appointments: [appointment({ status: "liberado" })],
        risksById: risksOf(risk("apt-001", "alto")),
        overbookings: [],
      }),
    ).toEqual([]);
  });

  it("usa como âncora o agendamento de maior risco do bloco", () => {
    const [opportunity] = findOverbookingOpportunities({
      appointments: [appointment(), appointment({ id: "apt-009", patientId: "pat-x" })],
      risksById: risksOf(risk("apt-001", "alto", 62), risk("apt-009", "alto", 80)),
      overbookings: [],
    });
    expect(opportunity.anchor.id).toBe("apt-009");
  });

  it("respeita o limite de encaixes por bloco, lido da constante", () => {
    const encaixes = Array.from({ length: MAX_OVERBOOKINGS_PER_BLOCK }, (_, index) =>
      accepted({ id: `ovb-${index}`, sequence: index + 1, encaixeAppointmentId: `apt-enc-${index}` }),
    );
    expect(
      findOverbookingOpportunities({
        appointments: [appointment()],
        risksById: risksOf(risk("apt-001", "alto")),
        overbookings: encaixes,
      }),
    ).toEqual([]);
  });

  it("aceita um limite maior quando informado", () => {
    const [opportunity] = findOverbookingOpportunities({
      appointments: [appointment()],
      risksById: risksOf(risk("apt-001", "alto")),
      overbookings: [accepted()],
      limit: 2,
    });
    expect(opportunity.acceptedCount).toBe(1);
    expect(opportunity.limit).toBe(2);
  });

  it("encaixe nunca vira âncora", () => {
    expect(
      findOverbookingOpportunities({
        appointments: [appointment({ id: "apt-enc-1", patientId: "pat-helena" })],
        risksById: risksOf(risk("apt-enc-1", "alto")),
        overbookings: [accepted({ scheduledAt: "2026-09-30T12:00:00.000Z" })],
        limit: 5,
      }),
    ).toEqual([]);
  });

  it("a recusa esconde a sugestão do bloco, mesmo com offset diferente", () => {
    expect(
      findOverbookingOpportunities({
        appointments: [appointment()],
        risksById: risksOf(risk("apt-001", "alto")),
        overbookings: [refused({ scheduledAt: "2026-09-22T09:00:00-03:00" })],
      }),
    ).toEqual([]);
  });

  it("devolve as sugestões em ordem de horário", () => {
    const opportunities = findOverbookingOpportunities({
      appointments: [
        appointment({ id: "late", scheduledAt: "2026-09-25T12:00:00.000Z" }),
        appointment({ id: "early", scheduledAt: "2026-09-21T12:00:00.000Z" }),
      ],
      risksById: risksOf(risk("late", "alto"), risk("early", "alto")),
      overbookings: [],
    });
    expect(opportunities.map((item) => item.anchor.id)).toEqual(["early", "late"]);
  });
});

describe("pickEncaixeCandidate e findOverbookingSuggestions", () => {
  const block = slotBlockOf(appointment());

  it("escolhe o primeiro na ordem do leilão (distância, depois espera)", () => {
    const picked = pickEncaixeCandidate({
      block,
      appointments: [appointment()],
      candidates: [
        waitingCandidate({ id: "wl-far", patientId: "p1", distanceKm: 12 }),
        waitingCandidate({ id: "wl-near-new", patientId: "p2", requestedAt: "2026-09-01T12:00:00.000Z" }),
        waitingCandidate({ id: "wl-near-old", patientId: "p3", requestedAt: "2026-07-01T12:00:00.000Z" }),
      ],
      busyPatientIds: new Set(),
    });
    expect(picked).toMatchObject({ waitlistId: "wl-near-old", band: "perto", distanceKm: 2.1 });
  });

  it("ignora quem já está marcado no bloco e quem tem oferta em aberto", () => {
    const picked = pickEncaixeCandidate({
      block,
      appointments: [appointment({ patientId: "pat-helena" })],
      candidates: [
        waitingCandidate(),
        waitingCandidate({ id: "wl-busy", patientId: "pat-busy" }),
        waitingCandidate({ id: "wl-ok", patientId: "pat-ok", distanceKm: 8 }),
      ],
      busyPatientIds: new Set(["pat-busy"]),
    });
    expect(picked?.waitlistId).toBe("wl-ok");
  });

  it("ignora outra especialidade e quem não está aguardando", () => {
    expect(
      pickEncaixeCandidate({
        block,
        appointments: [],
        candidates: [
          waitingCandidate({ specialty: "Oftalmologia" }),
          waitingCandidate({ id: "wl-x", status: "atribuido" }),
        ],
        busyPatientIds: new Set(),
      }),
    ).toBeNull();
  });

  it("só sugere blocos que têm candidato", () => {
    const input = {
      appointments: [appointment()],
      risksById: risksOf(risk("apt-001", "alto")),
      overbookings: [],
      busyPatientIds: new Set<string>(),
    };
    expect(findOverbookingSuggestions({ ...input, candidates: [] })).toEqual([]);
    const [suggestion] = findOverbookingSuggestions({ ...input, candidates: [waitingCandidate()] });
    expect(suggestion.candidate).toEqual({
      waitlistId: "wl-001",
      patientId: "pat-helena",
      patientName: "Helena Dias",
      distanceKm: 2.1,
      band: "perto",
    });
  });
});

describe("assertCanOverbook", () => {
  const anchor = appointment();

  it("devolve a oportunidade quando o bloco comporta encaixe", () => {
    const opportunity = assertCanOverbook({
      anchor,
      risk: risk("apt-001", "alto"),
      overbookings: [],
    });
    expect(opportunity).toMatchObject({ acceptedCount: 0, limit: MAX_OVERBOOKINGS_PER_BLOCK });
  });

  it("recusa âncora inativa", () => {
    expectOverbookingError(
      () =>
        assertCanOverbook({
          anchor: appointment({ status: "liberado" }),
          risk: risk("apt-001", "alto"),
          overbookings: [],
        }),
      "ANCHOR_NOT_ACTIVE",
    );
  });

  it("recusa encaixe como âncora", () => {
    expectOverbookingError(
      () =>
        assertCanOverbook({
          anchor: appointment({ id: "apt-enc-1" }),
          risk: risk("apt-enc-1", "alto"),
          overbookings: [accepted()],
          limit: 5,
        }),
      "ANCHOR_IS_ENCAIXE",
    );
  });

  it.each([
    ["médio", risk("apt-001", "medio")],
    ["sem score", undefined],
  ])("recusa risco %s", (_label, anchorRisk) => {
    expectOverbookingError(
      () => assertCanOverbook({ anchor, risk: anchorRisk, overbookings: [] }),
      "NOT_HIGH_RISK",
    );
  });

  it("recusa bloco já recusado", () => {
    expectOverbookingError(
      () => assertCanOverbook({ anchor, risk: risk("apt-001", "alto"), overbookings: [refused()] }),
      "ALREADY_REFUSED",
    );
  });

  it("recusa quando o limite foi atingido", () => {
    expectOverbookingError(
      () => assertCanOverbook({ anchor, risk: risk("apt-001", "alto"), overbookings: [accepted()] }),
      "LIMIT_REACHED",
    );
  });
});

describe("createEncaixe e refuseOverbooking", () => {
  const anchor = appointment({
    procedure: { type: "exame", examName: "Eletroencefalograma" },
    preparation: { result: "ok", missedItemIds: [], answeredAt: DECIDED_AT },
  });
  const opportunity = assertCanOverbook({
    anchor,
    risk: risk("apt-001", "alto"),
    overbookings: [],
  });
  const candidate = waitingCandidate();

  it("o encaixe acontece na unidade da âncora e nunca é retorno", () => {
    const unit = { id: "unit-centro", name: "Unidade Centro" };
    const result = createEncaixe({
      opportunity: assertCanOverbook({
        anchor: appointment({ unit, returnOfAppointmentId: "apt-000" }),
        risk: risk("apt-001", "alto"),
        overbookings: [],
      }),
      candidate,
      encaixeId: "apt-enc-1",
      overbookingId: "ovb-1",
      decidedAt: DECIDED_AT,
    });

    expect(result.appointment.unit).toEqual(unit);
    expect(result.appointment.returnOfAppointmentId).toBeNull();
  });

  it("cria o encaixe pendente no horário da âncora e atribui o candidato", () => {
    const result = createEncaixe({
      opportunity,
      candidate,
      encaixeId: "apt-enc-1",
      overbookingId: "ovb-1",
      decidedAt: DECIDED_AT,
    });
    expect(result.appointment).toEqual({
      id: "apt-enc-1",
      patientId: "pat-helena",
      patientName: "Helena Dias",
      phoneMasked: "(79) 9****-2222",
      specialty: "Neurologia",
      scheduledAt: SLOT_AT,
      bookedAt: DECIDED_AT,
      status: "pendente",
      procedure: { type: "exame", examName: "Eletroencefalograma" },
      preparation: null,
      unit: null,
      returnOfAppointmentId: null,
    });
    expect(result.candidate.status).toBe("atribuido");
    expect(result.overbooking).toEqual({
      id: "ovb-1",
      anchorAppointmentId: "apt-001",
      specialty: "Neurologia",
      scheduledAt: SLOT_AT,
      decision: "aceita",
      sequence: 1,
      encaixeAppointmentId: "apt-enc-1",
      riskProbability: 64,
      decidedAt: DECIDED_AT,
    });
  });

  it("decisão depois do horário marca o encaixe no próprio horário", () => {
    const { appointment: encaixe } = createEncaixe({
      opportunity,
      candidate,
      encaixeId: "apt-enc-1",
      overbookingId: "ovb-1",
      decidedAt: "2026-10-06T12:00:00.000Z",
    });
    expect(encaixe.bookedAt).toBe(SLOT_AT);
  });

  it("recusa candidato que não está aguardando", () => {
    expectOverbookingError(
      () =>
        createEncaixe({
          opportunity,
          candidate: { ...candidate, status: "atribuido" },
          encaixeId: "apt-enc-1",
          overbookingId: "ovb-1",
          decidedAt: DECIDED_AT,
        }),
      "NO_CANDIDATES",
    );
  });

  it("registra a recusa sem encaixe nem número", () => {
    expect(refuseOverbooking({ opportunity, overbookingId: "ovb-2", decidedAt: DECIDED_AT })).toEqual(
      refused(),
    );
  });
});

describe("isOverbookingDecisionInput", () => {
  it.each([
    ["aceitar", true],
    ["recusar", true],
    ["aceita", false],
    [undefined, false],
  ])("%s é %s", (value, expected) => {
    expect(isOverbookingDecisionInput(value)).toBe(expected);
  });
});

describe("convivência com o leilão", () => {
  const anchor = appointment();
  const encaixe = appointment({ id: "apt-enc-1", patientId: "pat-helena", patientName: "Helena Dias" });

  it("o encaixe cancela e a vaga fica coberta pela âncora", () => {
    const cancelled = { ...encaixe, status: "liberado" as const };
    expect(
      isSlotCoveredByOverbooking(cancelled, {
        appointments: [anchor, cancelled],
        overbookings: [accepted()],
        pendingOffers: [],
      }),
    ).toBe(true);
  });

  it("a âncora cancela e a vaga fica coberta pelo encaixe", () => {
    const cancelled = { ...anchor, status: "liberado" as const };
    expect(
      coveredAppointmentIds({
        appointments: [cancelled, encaixe],
        overbookings: [accepted()],
        pendingOffers: [],
      }),
    ).toEqual(new Set(["apt-001"]));
  });

  it("remarcação também conta como vaga liberada coberta", () => {
    const cancelled = { ...anchor, status: "remarcacao_solicitada" as const };
    expect(
      isSlotCoveredByOverbooking(cancelled, {
        appointments: [cancelled, encaixe],
        overbookings: [accepted()],
        pendingOffers: [],
      }),
    ).toBe(true);
  });

  it("os dois cancelam: o primeiro abre leilão e o segundo fica coberto pela oferta aberta", () => {
    const anchorCancelled = { ...anchor, status: "liberado" as const };
    const encaixeCancelled = { ...encaixe, status: "liberado" as const };
    const appointments = [anchorCancelled, encaixeCancelled];

    expect(
      coveredAppointmentIds({ appointments, overbookings: [accepted()], pendingOffers: [] }),
    ).toEqual(new Set());

    expect(
      coveredAppointmentIds({
        appointments,
        overbookings: [accepted()],
        pendingOffers: [{ appointmentId: "apt-001" }],
      }),
    ).toEqual(new Set(["apt-enc-1"]));
  });

  it("vaga ativa nunca é tratada como coberta", () => {
    expect(
      isSlotCoveredByOverbooking(anchor, {
        appointments: [anchor, encaixe],
        overbookings: [accepted()],
        pendingOffers: [],
      }),
    ).toBe(false);
  });

  it("regressão: bloco sem encaixe aceito continua abrindo leilão", () => {
    const cancelled = { ...anchor, status: "liberado" as const };
    const other = appointment({ id: "apt-002", patientId: "pat-x" });
    for (const overbookings of [[], [refused()], [accepted({ scheduledAt: "2026-09-30T12:00:00.000Z" })]]) {
      expect(
        isSlotCoveredByOverbooking(cancelled, {
          appointments: [cancelled, other],
          overbookings,
          pendingOffers: [],
        }),
      ).toBe(false);
    }
  });
});
