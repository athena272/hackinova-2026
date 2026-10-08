import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "../appointment";
import {
  acceptSlotOffer,
  assertCanStartCascade,
  createOffer,
  DEFAULT_SLOT_OFFER_TIMEOUT,
  DISTANCE_BANDS,
  distanceBandFor,
  expireOffer,
  groupOffersByAppointment,
  isOfferExpired,
  isSlotOfferTimeout,
  pickNextOffer,
  rankCandidates,
  respondToOffer,
  SLOT_OFFER_TIMEOUT_OPTIONS,
  SlotOfferError,
  slotReleaseReasonOf,
  type RankingContext,
  type SlotOffer,
} from ".";
import type { DuplicateCheck, ResolvedDuplicateCheck } from "../duplicate-booking";
import {
  candidate,
  NOW,
  pendingOffer,
  slotAppointment,
  waitlistEntry,
} from "./slot-offer.test-utils";

const context = (overrides: Partial<RankingContext> = {}): RankingContext => ({
  specialty: "Endocrinologia",
  alreadyOfferedWaitlistIds: new Set(),
  busyPatientIds: new Set(),
  ...overrides,
});

function expectSlotOfferError(action: () => unknown, code: SlotOfferError["code"]) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(SlotOfferError);
    expect((error as SlotOfferError).code).toBe(code);
    return;
  }
  throw new Error(`Esperava SlotOfferError ${code}, mas nada foi lançado.`);
}

const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);

describe("regras da oferta", () => {
  it("o prazo padrão é uma das opções e só as opções valem", () => {
    expect(SLOT_OFFER_TIMEOUT_OPTIONS).toContain(DEFAULT_SLOT_OFFER_TIMEOUT);
    for (const option of SLOT_OFFER_TIMEOUT_OPTIONS) {
      expect(isSlotOfferTimeout(option)).toBe(true);
    }
    expect(isSlotOfferTimeout(7)).toBe(false);
    expect(isSlotOfferTimeout("15")).toBe(false);
  });

  it("faixas de distância usam os limites do arquivo de regras", () => {
    expect(distanceBandFor(DISTANCE_BANDS.pertoAteKm)).toBe("perto");
    expect(distanceBandFor(DISTANCE_BANDS.pertoAteKm + 0.1)).toBe("medio");
    expect(distanceBandFor(DISTANCE_BANDS.medioAteKm)).toBe("medio");
    expect(distanceBandFor(DISTANCE_BANDS.medioAteKm + 0.1)).toBe("longe");
    expect(distanceBandFor(null)).toBe("desconhecida");
  });
});

describe("rankCandidates", () => {
  const igor = candidate({ id: "wl-002", patientId: "pat-igor", distanceKm: 3.7, requestedAt: "2026-08-10T13:00:00.000Z" });
  const lucas = candidate({ id: "wl-007", patientId: "pat-lucas", distanceKm: 1.5, requestedAt: "2026-09-20T13:00:00.000Z" });
  const elena = candidate({ id: "wl-008", patientId: "pat-elena", distanceKm: 13, requestedAt: "2026-07-15T13:00:00.000Z" });
  const semBairro = candidate({ id: "wl-009", patientId: "pat-x", distanceKm: null, requestedAt: "2026-01-01T13:00:00.000Z" });
  const medio = candidate({ id: "wl-010", patientId: "pat-y", distanceKm: 8, requestedAt: "2026-09-25T13:00:00.000Z" });

  it("ordena por faixa de distância e, na mesma faixa, por quem espera há mais tempo", () => {
    const ranked = rankCandidates([elena, semBairro, lucas, medio, igor], context());

    expect(ids(ranked)).toEqual(["wl-002", "wl-007", "wl-010", "wl-008", "wl-009"]);
    expect(ranked.map((item) => item.band)).toEqual([
      "perto",
      "perto",
      "medio",
      "longe",
      "desconhecida",
    ]);
  });

  it("desempata pelo id quando faixa e espera são iguais, para a ordem ser estável", () => {
    const a = candidate({ id: "wl-b", patientId: "p1" });
    const b = candidate({ id: "wl-a", patientId: "p2" });

    expect(ids(rankCandidates([a, b], context()))).toEqual(["wl-a", "wl-b"]);
  });

  it("deixa de fora outra especialidade, quem já foi atribuído, quem já recebeu esta vaga e quem tem oferta em aberto", () => {
    const ranked = rankCandidates(
      [
        igor,
        lucas,
        elena,
        candidate({ id: "wl-011", patientId: "pat-z", specialty: "Neurologia" }),
        candidate({ id: "wl-012", patientId: "pat-w", status: "atribuido" }),
      ],
      context({
        alreadyOfferedWaitlistIds: new Set(["wl-002"]),
        busyPatientIds: new Set(["pat-lucas"]),
      }),
    );

    expect(ids(ranked)).toEqual(["wl-008"]);
  });

  it("não altera a lista recebida", () => {
    const input = [elena, igor];
    rankCandidates(input, context());
    expect(ids(input)).toEqual(["wl-008", "wl-002"]);
  });
});

describe("início da cascata", () => {
  it.each<AppointmentStatus>(["liberado", "remarcacao_solicitada"])("aceita vaga %s sem oferta aberta", (status) => {
    expect(() =>
      assertCanStartCascade(slotAppointment({ status }), [pendingOffer({ status: "recusada", closedAt: NOW })]),
    ).not.toThrow();
  });

  it.each<AppointmentStatus>(["pendente", "confirmado", "compareceu", "faltou"])("recusa vaga %s", (status) => {
    expectSlotOfferError(() => assertCanStartCascade(slotAppointment({ status }), []), "SLOT_NOT_REUSABLE");
  });

  it("recusa começar outra cascata enquanto há oferta aguardando resposta", () => {
    expectSlotOfferError(
      () => assertCanStartCascade(slotAppointment(), [pendingOffer()]),
      "CASCADE_ALREADY_ACTIVE",
    );
  });
});

describe("createOffer e pickNextOffer", () => {
  it("cria a oferta pendente com o prazo somado ao horário e a distância do candidato", () => {
    const offer = createOffer({
      id: "offer-1",
      appointmentId: "apt-006",
      candidate: { ...candidate(), band: "perto" },
      offeredAt: NOW,
      timeoutMinutes: 2,
      releaseReason: "preparo",
    });

    expect(offer).toEqual({
      id: "offer-1",
      appointmentId: "apt-006",
      candidate: { waitlistId: "wl-002", patientId: "pat-igor", patientName: "Igor Santos" },
      status: "pendente",
      offeredAt: NOW,
      expiresAt: "2026-10-06T15:02:00.000Z",
      closedAt: null,
      timeoutMinutes: 2,
      distanceKm: 3.7,
      releaseReason: "preparo",
    });
  });

  it("recusa prazo fora das opções", () => {
    expectSlotOfferError(
      () =>
        createOffer({
          id: "offer-1",
          appointmentId: "apt-006",
          candidate: { ...candidate(), band: "perto" },
          offeredAt: NOW,
          timeoutMinutes: 7 as never,
          releaseReason: "cancelamento",
        }),
      "INVALID_TIMEOUT",
    );
  });

  const lucas = candidate({ id: "wl-007", patientId: "pat-lucas", patientName: "Lucas Ferreira", distanceKm: 1.5, requestedAt: "2026-09-20T13:00:00.000Z" });
  const next = (offersOfAppointment: SlotOffer[], pendingOffers: SlotOffer[] = []) =>
    pickNextOffer({
      id: "offer-2",
      appointment: slotAppointment(),
      candidates: [candidate(), lucas],
      offersOfAppointment,
      pendingOffers,
      offeredAt: NOW,
      timeoutMinutes: 15,
      releaseReason: "booking_duplo",
    });

  it("oferece ao primeiro da fila, com o motivo da liberação", () => {
    expect(next([])).toMatchObject({
      candidate: { waitlistId: "wl-002" },
      releaseReason: "booking_duplo",
    });
  });

  it("depois de uma recusa ou expiração, passa ao próximo que ainda não recebeu esta vaga", () => {
    const refused = pendingOffer({ status: "recusada", closedAt: NOW });
    expect(next([refused])?.candidate.waitlistId).toBe("wl-007");
  });

  it("pula o paciente que tem oferta em aberto em outra vaga", () => {
    const elsewhere = pendingOffer({ id: "offer-x", appointmentId: "apt-099" });
    expect(next([], [elsewhere])?.candidate.waitlistId).toBe("wl-007");
  });

  it("devolve null quando a fila acabou", () => {
    const offered = [
      pendingOffer({ status: "expirada", closedAt: NOW }),
      pendingOffer({
        id: "offer-2",
        status: "recusada",
        closedAt: NOW,
        candidate: { waitlistId: "wl-007", patientId: "pat-lucas", patientName: "Lucas Ferreira" },
      }),
    ];
    expect(next(offered)).toBeNull();
  });

  it("devolve null com a lista de espera vazia", () => {
    expect(
      pickNextOffer({
        id: "offer-1",
        appointment: slotAppointment(),
        candidates: [],
        offersOfAppointment: [],
        pendingOffers: [],
        offeredAt: NOW,
        timeoutMinutes: 15,
        releaseReason: "cancelamento",
      }),
    ).toBeNull();
  });
});

describe("slotReleaseReasonOf", () => {
  const RESOLVED_AT = "2026-10-06T14:00:00.000Z";
  const duplicateResolved = (overrides: Partial<ResolvedDuplicateCheck> = {}): ResolvedDuplicateCheck => ({
    id: "dup-1",
    patientId: "pat-fabio",
    groupKey: "apt-005,apt-006",
    appointmentIds: ["apt-005", "apt-006"],
    status: "resolvida",
    sentAt: "2026-10-06T13:00:00.000Z",
    keptAppointmentId: "apt-005",
    resolvedAt: RESOLVED_AT,
    ...overrides,
  });
  const reasonFor = (input: Partial<Parameters<typeof slotReleaseReasonOf>[0]> = {}) =>
    slotReleaseReasonOf({
      appointment: slotAppointment(),
      duplicateChecks: [],
      offersOfAppointment: [],
      ...input,
    });

  it("cancelamento comum quando nada explica a liberação", () => {
    expect(reasonFor()).toBe("cancelamento");
  });

  it("preparo quando o paciente avisou que não cumpre o preparo", () => {
    const appointment = slotAppointment({
      procedure: { type: "exame", examName: "Ultrassonografia de abdome total" },
      preparation: { result: "nao_cumprido", missedItemIds: ["bexiga"], answeredAt: NOW },
    });

    expect(reasonFor({ appointment })).toBe("preparo");
  });

  it("booking duplo quando a vaga foi a descartada na confirmação reforçada", () => {
    expect(reasonFor({ duplicateChecks: [duplicateResolved()] })).toBe("booking_duplo");
  });

  it("não é booking duplo quando a vaga foi a mantida ou a confirmação ainda aguarda", () => {
    expect(reasonFor({ duplicateChecks: [duplicateResolved({ keptAppointmentId: "apt-006" })] })).toBe(
      "cancelamento",
    );
    const open: DuplicateCheck = {
      ...duplicateResolved(),
      status: "aguardando",
      keptAppointmentId: null,
      resolvedAt: null,
    };
    expect(reasonFor({ duplicateChecks: [open] })).toBe("cancelamento");
  });

  it("depois que a vaga do booking duplo foi preenchida, um novo cancelamento é comum", () => {
    const refilled = pendingOffer({ status: "aceita", closedAt: "2026-10-06T14:30:00.000Z" });

    expect(reasonFor({ duplicateChecks: [duplicateResolved()], offersOfAppointment: [refilled] })).toBe(
      "cancelamento",
    );
  });

  it("recusas e expirações não contam como preenchimento", () => {
    const refused = pendingOffer({ status: "recusada", closedAt: "2026-10-06T14:30:00.000Z" });

    expect(reasonFor({ duplicateChecks: [duplicateResolved()], offersOfAppointment: [refused] })).toBe(
      "booking_duplo",
    );
  });
});

describe("resposta e expiração", () => {
  it("considera vencida só a oferta pendente a partir do fim do prazo", () => {
    const offer = pendingOffer();
    expect(isOfferExpired(offer, "2026-10-06T15:14:59.999Z")).toBe(false);
    expect(isOfferExpired(offer, offer.expiresAt)).toBe(true);
    expect(isOfferExpired({ ...offer, status: "recusada", closedAt: NOW }, "2026-10-06T16:00:00.000Z")).toBe(false);
  });

  it.each([
    ["aceitar", "aceita"],
    ["recusar", "recusada"],
  ] as const)("%s dentro do prazo fecha a oferta como %s", (response, status) => {
    const respondedAt = "2026-10-06T15:05:00.000Z";
    expect(respondToOffer(pendingOffer(), response, respondedAt)).toMatchObject({
      status,
      closedAt: respondedAt,
    });
  });

  it("recusa resposta depois do prazo", () => {
    expectSlotOfferError(
      () => respondToOffer(pendingOffer(), "aceitar", "2026-10-06T15:15:00.000Z"),
      "OFFER_EXPIRED",
    );
  });

  it("responder a uma oferta que a sincronização já expirou avisa que o prazo acabou", () => {
    const expired = expireOffer(pendingOffer());
    expectSlotOfferError(() => respondToOffer(expired, "aceitar", NOW), "OFFER_EXPIRED");
  });

  it("recusa responder ou expirar uma oferta já encerrada", () => {
    const closed = pendingOffer({ status: "aceita", closedAt: NOW });
    expectSlotOfferError(() => respondToOffer(closed, "recusar", NOW), "OFFER_NOT_PENDING");
    expectSlotOfferError(() => expireOffer(closed), "OFFER_NOT_PENDING");
  });

  it("expira no fim do prazo, mesmo que a expiração seja aplicada depois", () => {
    const offer = pendingOffer();
    expect(expireOffer(offer)).toMatchObject({ status: "expirada", closedAt: offer.expiresAt });
  });
});

describe("acceptSlotOffer", () => {
  it("passa a vaga ao candidato já confirmada, com preparo zerado e marcação no aceite", () => {
    const acceptedAt = "2026-10-06T15:05:00.000Z";
    const { appointment, candidate: assigned } = acceptSlotOffer(
      slotAppointment({
        preparation: { result: "nao_cumprido", missedItemIds: ["x"], answeredAt: NOW },
      }),
      waitlistEntry(),
      acceptedAt,
    );

    expect(appointment).toMatchObject({
      patientId: "pat-igor",
      patientName: "Igor Santos",
      status: "confirmado",
      bookedAt: acceptedAt,
      preparation: null,
    });
    expect(assigned.status).toBe("atribuido");
  });
});

describe("groupOffersByAppointment", () => {
  it("agrupa por vaga em ordem de oferta e resume a situação pela última", () => {
    const at = (minutes: number) => new Date(Date.parse(NOW) + minutes * 60_000).toISOString();
    const offers = [
      pendingOffer({ id: "b2", appointmentId: "apt-b", offeredAt: at(10), status: "aceita", closedAt: at(11) }),
      pendingOffer({ id: "a2", appointmentId: "apt-a", offeredAt: at(5) }),
      pendingOffer({ id: "a1", appointmentId: "apt-a", offeredAt: at(0), status: "expirada", closedAt: at(2) }),
      pendingOffer({ id: "c1", appointmentId: "apt-c", offeredAt: at(1), status: "recusada", closedAt: at(1) }),
    ];

    const cascades = groupOffersByAppointment(offers);

    expect(cascades.map(({ appointmentId, state }) => [appointmentId, state])).toEqual([
      ["apt-b", "aceita"],
      ["apt-a", "em_andamento"],
      ["apt-c", "encerrada"],
    ]);
    expect(ids(cascades[1].offers)).toEqual(["a1", "a2"]);
  });
});
