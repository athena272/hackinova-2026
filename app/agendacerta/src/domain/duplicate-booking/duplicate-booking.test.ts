import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "../appointment";
import {
  booking,
  CENTRO,
  JARDINS,
  openCheck,
  RESOLVED_AT,
  resolvedCheck,
  SENT_AT,
  september,
} from "./duplicate-booking.test-utils";
import {
  buildDuplicateOverview,
  DUPLICATE_WINDOW_DAYS,
  DUPLICATE_WINDOW_MS,
  DuplicateBookingError,
  type DuplicateBookingErrorCode,
  findDuplicateGroups,
  findGroupByAppointmentIds,
  groupKeyOf,
  isEffectiveOpenCheck,
  isLegitimateReturn,
  resolveDuplicateCheck,
  serviceKeyOf,
  startDuplicateCheck,
} from "./index";

function expectDuplicateError(action: () => unknown, code: DuplicateBookingErrorCode) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DuplicateBookingError);
    expect((error as DuplicateBookingError).code).toBe(code);
    return;
  }
  throw new Error(`Esperava DuplicateBookingError com código ${code}`);
}

const groupIds = (appointments: Parameters<typeof findDuplicateGroups>[0]) =>
  findDuplicateGroups(appointments).map((group) => group.appointments.map(({ id }) => id));

describe("regras do booking duplo", () => {
  it("a janela de datas próximas fica numa constante", () => {
    expect(DUPLICATE_WINDOW_DAYS).toBe(30);
    expect(DUPLICATE_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("consulta vale pela especialidade e exame pelo nome, sem diferenciar caixa e espaços", () => {
    expect(serviceKeyOf({ specialty: " Neurologia ", procedure: { type: "consulta" } })).toBe(
      serviceKeyOf({ specialty: "neurologia", procedure: { type: "consulta" } }),
    );
    expect(
      serviceKeyOf({
        specialty: "Ultrassonografia",
        procedure: { type: "exame", examName: "Ultrassonografia de Abdome Total " },
      }),
    ).toBe("exame:ultrassonografia de abdome total");
  });

  it("a chave do grupo não depende da ordem dos ids", () => {
    expect(groupKeyOf(["apt-b", "apt-a"])).toBe(groupKeyOf(["apt-a", "apt-b"]));
  });
});

describe("findDuplicateGroups", () => {
  it("detecta a mesma consulta marcada duas vezes em datas próximas", () => {
    const groups = findDuplicateGroups([
      booking({ id: "apt-a", scheduledAt: september(22) }),
      booking({ id: "apt-b", scheduledAt: september(24) }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      key: "apt-a,apt-b",
      patientId: "pat-bruno",
      patientName: "Bruno Lima",
      specialty: "Endocrinologia",
      procedure: { type: "consulta" },
    });
  });

  it("detecta duplicidade em unidades diferentes da rede", () => {
    expect(
      groupIds([
        booking({ id: "apt-a", unit: JARDINS }),
        booking({ id: "apt-b", scheduledAt: september(24), unit: CENTRO }),
      ]),
    ).toEqual([["apt-a", "apt-b"]]);
  });

  it("detecta o mesmo exame pelo nome e ignora exames diferentes da mesma especialidade", () => {
    const abdome = { type: "exame", examName: "Ultrassonografia de abdome total" } as const;
    const tireoide = { type: "exame", examName: "Ultrassonografia de tireoide" } as const;

    expect(
      groupIds([
        booking({ id: "apt-a", specialty: "Ultrassonografia", procedure: abdome }),
        booking({ id: "apt-b", specialty: "Ultrassonografia", procedure: abdome, scheduledAt: september(25) }),
      ]),
    ).toEqual([["apt-a", "apt-b"]]);
    expect(
      groupIds([
        booking({ id: "apt-a", specialty: "Ultrassonografia", procedure: abdome }),
        booking({ id: "apt-b", specialty: "Ultrassonografia", procedure: tireoide, scheduledAt: september(25) }),
      ]),
    ).toEqual([]);
  });

  it("não junta especialidades diferentes nem pacientes diferentes", () => {
    expect(
      groupIds([
        booking({ id: "apt-a" }),
        booking({ id: "apt-b", specialty: "Neurologia", scheduledAt: september(23) }),
        booking({ id: "apt-c", patientId: "pat-outro", scheduledAt: september(24) }),
      ]),
    ).toEqual([]);
  });

  it("respeita a janela: no limite conta, um minuto depois não", () => {
    const start = Date.parse(september(1));
    const atLimit = new Date(start + DUPLICATE_WINDOW_MS).toISOString();
    const pastLimit = new Date(start + DUPLICATE_WINDOW_MS + 60_000).toISOString();

    expect(
      groupIds([booking({ id: "apt-a", scheduledAt: september(1) }), booking({ id: "apt-b", scheduledAt: atLimit })]),
    ).toEqual([["apt-a", "apt-b"]]);
    expect(
      groupIds([booking({ id: "apt-a", scheduledAt: september(1) }), booking({ id: "apt-b", scheduledAt: pastLimit })]),
    ).toEqual([]);
  });

  it("encadeia horários seguidos dentro da janela num grupo só", () => {
    expect(
      groupIds([
        booking({ id: "apt-c", scheduledAt: "2026-10-20T13:00:00.000Z" }),
        booking({ id: "apt-a", scheduledAt: september(1) }),
        booking({ id: "apt-b", scheduledAt: september(25) }),
      ]),
    ).toEqual([["apt-a", "apt-b", "apt-c"]]);
  });

  it.each<AppointmentStatus>(["liberado", "remarcacao_solicitada", "compareceu", "faltou"])(
    "ignora agendamento com status %s",
    (status) => {
      expect(
        groupIds([booking({ id: "apt-a" }), booking({ id: "apt-b", scheduledAt: september(24), status })]),
      ).toEqual([]);
    },
  );

  it("considera pendente e confirmado juntos", () => {
    expect(
      groupIds([
        booking({ id: "apt-a", status: "confirmado" }),
        booking({ id: "apt-b", scheduledAt: september(24), status: "pendente" }),
      ]),
    ).toEqual([["apt-a", "apt-b"]]);
  });

  describe("retorno legítimo nunca é marcado como duplo", () => {
    it("retorno vinculado à consulta ativa, dentro da janela, não gera alerta", () => {
      const origin = booking({ id: "apt-a", specialty: "Cardiologia", scheduledAt: september(15) });
      const returnVisit = booking({
        id: "apt-b",
        specialty: "Cardiologia",
        scheduledAt: september(29),
        returnOfAppointmentId: "apt-a",
      });

      expect(findDuplicateGroups([origin, returnVisit])).toEqual([]);
    });

    it("retorno vinculado a uma consulta do histórico também é legítimo", () => {
      const origin = booking({ id: "hist-a", status: "compareceu", scheduledAt: september(1) });
      const returnVisit = booking({ id: "apt-b", scheduledAt: september(15), returnOfAppointmentId: "hist-a" });

      expect(isLegitimateReturn(returnVisit, new Map([[origin.id, origin], [returnVisit.id, returnVisit]]))).toBe(
        true,
      );
    });

    it("um terceiro horário sem vínculo continua duplicado da consulta de origem", () => {
      expect(
        groupIds([
          booking({ id: "apt-a", scheduledAt: september(10) }),
          booking({ id: "apt-b", scheduledAt: september(20), returnOfAppointmentId: "apt-a" }),
          booking({ id: "apt-c", scheduledAt: september(12) }),
        ]),
      ).toEqual([["apt-a", "apt-c"]]);
    });

    it("vínculo para outro paciente, outro serviço ou agendamento inexistente não protege", () => {
      const otherPatient = booking({ id: "apt-x", patientId: "pat-outro", scheduledAt: september(1) });
      const otherService = booking({ id: "apt-y", specialty: "Neurologia", scheduledAt: september(1) });
      const cases = ["apt-x", "apt-y", "apt-inexistente"];

      for (const originId of cases) {
        expect(
          groupIds([
            otherPatient,
            otherService,
            booking({ id: "apt-a" }),
            booking({ id: "apt-b", scheduledAt: september(24), returnOfAppointmentId: originId }),
          ]),
          originId,
        ).toEqual([["apt-a", "apt-b"]]);
      }
    });
  });

  it("devolve os grupos em ordem de horário, sem depender da ordem de entrada", () => {
    const list = [
      booking({ id: "apt-d", patientId: "pat-2", patientName: "Diego", scheduledAt: september(10) }),
      booking({ id: "apt-a", scheduledAt: september(20) }),
      booking({ id: "apt-e", patientId: "pat-2", patientName: "Diego", scheduledAt: september(11) }),
      booking({ id: "apt-b", scheduledAt: september(21) }),
    ];

    expect(groupIds(list)).toEqual([["apt-d", "apt-e"], ["apt-a", "apt-b"]]);
    expect(groupIds([...list].reverse())).toEqual(groupIds(list));
  });

  it("encontra o grupo pelos ids em qualquer ordem", () => {
    const groups = findDuplicateGroups([
      booking({ id: "apt-a" }),
      booking({ id: "apt-b", scheduledAt: september(24) }),
    ]);

    expect(findGroupByAppointmentIds(groups, ["apt-b", "apt-a"])?.key).toBe("apt-a,apt-b");
    expect(findGroupByAppointmentIds(groups, ["apt-a"])).toBeNull();
  });
});

describe("startDuplicateCheck", () => {
  const appointments = [booking({ id: "apt-a" }), booking({ id: "apt-b", scheduledAt: september(24) })];
  const [group] = findDuplicateGroups(appointments);

  it("monta a confirmação aguardando com os horários em ordem", () => {
    expect(startDuplicateCheck({ group, checks: [], appointments, id: "dup-1", sentAt: SENT_AT })).toEqual(
      openCheck(),
    );
  });

  it("recusa enviar de novo enquanto a confirmação aguarda resposta", () => {
    expectDuplicateError(
      () => startDuplicateCheck({ group, checks: [openCheck()], appointments, id: "dup-2", sentAt: SENT_AT }),
      "ALREADY_SENT",
    );
  });

  it("confirmação aberta cujo grupo se desfez não bloqueia um envio novo", () => {
    const withNewBooking = [
      booking({ id: "apt-a" }),
      booking({ id: "apt-b", scheduledAt: september(24), status: "liberado" }),
      booking({ id: "apt-c", scheduledAt: september(26) }),
    ];
    const [newGroup] = findDuplicateGroups(withNewBooking);

    expect(
      startDuplicateCheck({
        group: newGroup,
        checks: [openCheck()],
        appointments: withNewBooking,
        id: "dup-2",
        sentAt: SENT_AT,
      }).appointmentIds,
    ).toEqual(["apt-a", "apt-c"]);
  });

  it("confirmação já resolvida não bloqueia", () => {
    expect(
      startDuplicateCheck({ group, checks: [resolvedCheck()], appointments, id: "dup-2", sentAt: SENT_AT }).id,
    ).toBe("dup-2");
  });
});

describe("isEffectiveOpenCheck", () => {
  it("vale só aberta e com pelo menos dois horários ativos", () => {
    expect(isEffectiveOpenCheck(openCheck(), new Set(["apt-a", "apt-b"]))).toBe(true);
    expect(isEffectiveOpenCheck(openCheck(), new Set(["apt-a"]))).toBe(false);
    expect(isEffectiveOpenCheck(resolvedCheck(), new Set(["apt-a", "apt-b"]))).toBe(false);
  });
});

describe("resolveDuplicateCheck", () => {
  const appointments = [
    booking({ id: "apt-a", status: "pendente" }),
    booking({ id: "apt-b", scheduledAt: september(24), status: "confirmado", unit: CENTRO }),
  ];

  it("confirma o horário mantido e libera os outros como vaga reaproveitável", () => {
    const result = resolveDuplicateCheck({
      check: openCheck(),
      appointments,
      keepAppointmentId: "apt-a",
      resolvedAt: RESOLVED_AT,
    });

    expect(result.check).toEqual(resolvedCheck());
    expect(result.kept).toMatchObject({ id: "apt-a", status: "confirmado" });
    expect(result.released).toEqual([{ ...appointments[1], status: "liberado" }]);
  });

  it("manter um horário já confirmado continua confirmado", () => {
    expect(
      resolveDuplicateCheck({ check: openCheck(), appointments, keepAppointmentId: "apt-b", resolvedAt: RESOLVED_AT })
        .kept.status,
    ).toBe("confirmado");
  });

  it("não libera horário que já não estava ativo", () => {
    const result = resolveDuplicateCheck({
      check: openCheck({ appointmentIds: ["apt-a", "apt-b", "apt-c"], groupKey: "apt-a,apt-b,apt-c" }),
      appointments: [...appointments, booking({ id: "apt-c", scheduledAt: september(26), status: "liberado" })],
      keepAppointmentId: "apt-a",
      resolvedAt: RESOLVED_AT,
    });

    expect(result.released.map(({ id }) => id)).toEqual(["apt-b"]);
  });

  it("recusa confirmação já resolvida", () => {
    expectDuplicateError(
      () =>
        resolveDuplicateCheck({
          check: resolvedCheck(),
          appointments,
          keepAppointmentId: "apt-a",
          resolvedAt: RESOLVED_AT,
        }),
      "CHECK_NOT_OPEN",
    );
  });

  it("recusa horário que não está na confirmação", () => {
    expectDuplicateError(
      () =>
        resolveDuplicateCheck({ check: openCheck(), appointments, keepAppointmentId: "apt-z", resolvedAt: RESOLVED_AT }),
      "APPOINTMENT_NOT_IN_CHECK",
    );
  });

  it("recusa manter horário que não está mais ativo", () => {
    expectDuplicateError(
      () =>
        resolveDuplicateCheck({
          check: openCheck(),
          appointments: [appointments[0], { ...appointments[1], status: "liberado" }],
          keepAppointmentId: "apt-b",
          resolvedAt: RESOLVED_AT,
        }),
      "APPOINTMENT_NOT_ACTIVE",
    );
  });

  it("recusa quando só sobrou um horário ativo (paciente já desmarcou pela confirmação normal)", () => {
    expectDuplicateError(
      () =>
        resolveDuplicateCheck({
          check: openCheck(),
          appointments: [appointments[0], { ...appointments[1], status: "liberado" }],
          keepAppointmentId: "apt-a",
          resolvedAt: RESOLVED_AT,
        }),
      "GROUP_DISSOLVED",
    );
  });
});

describe("buildDuplicateOverview", () => {
  const appointments = [booking({ id: "apt-a" }), booking({ id: "apt-b", scheduledAt: september(24) })];
  const groups = findDuplicateGroups(appointments);

  it("grupo sem envio aparece sem confirmação e marca os horários", () => {
    const overview = buildDuplicateOverview({ groups, checks: [], appointments });

    expect(overview.alerts).toHaveLength(1);
    expect(overview.alerts[0].check).toBeNull();
    expect(overview.flaggedAppointmentIds).toEqual(["apt-a", "apt-b"]);
    expect(overview.releasedAppointmentIds).toEqual([]);
  });

  it("grupo com confirmação aberta aparece aguardando", () => {
    const overview = buildDuplicateOverview({ groups, checks: [openCheck()], appointments });

    expect(overview.alerts[0].check).toEqual({
      id: "dup-1",
      sentAt: SENT_AT,
      appointmentIds: ["apt-a", "apt-b"],
    });
  });

  it("depois da escolha, o horário descartado aparece como liberado por duplicidade enquanto seguir liberado", () => {
    const afterChoice = [
      booking({ id: "apt-a", status: "confirmado" }),
      booking({ id: "apt-b", scheduledAt: september(24), status: "liberado" }),
    ];
    const overview = buildDuplicateOverview({
      groups: findDuplicateGroups(afterChoice),
      checks: [resolvedCheck()],
      appointments: afterChoice,
    });

    expect(overview.alerts).toEqual([]);
    expect(overview.releasedAppointmentIds).toEqual(["apt-b"]);

    const reoffered = [afterChoice[0], { ...afterChoice[1], status: "confirmado" as const, patientId: "pat-novo" }];
    expect(
      buildDuplicateOverview({ groups: [], checks: [resolvedCheck()], appointments: reoffered })
        .releasedAppointmentIds,
    ).toEqual([]);
  });
});
