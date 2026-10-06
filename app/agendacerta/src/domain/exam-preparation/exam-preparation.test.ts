import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "../appointment";
import {
  answerPreparationChecklist,
  findExamPreparation,
  getPreparationStatus,
  isAwaitingPreparationRelease,
  missedItemLabels,
  PreparationError,
  preparationStatusFor,
  releaseSlotForMissedPreparation,
} from ".";
import {
  BEXIGA,
  examAppointment,
  JEJUM,
  ULTRASSOM,
} from "./exam-preparation.test-utils";

const ANSWERED_AT = "2026-10-18T15:00:00.000Z";

function expectPreparationError(action: () => unknown, code: PreparationError["code"]) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(PreparationError);
    expect((error as PreparationError).code).toBe(code);
    return error as PreparationError;
  }
  throw new Error(`Esperava PreparationError ${code}, mas nada foi lançado.`);
}

describe("catálogo de preparo", () => {
  it("encontra o preparo pelo nome do exame", () => {
    expect(findExamPreparation(examAppointment().procedure, [ULTRASSOM])).toBe(ULTRASSOM);
  });

  it("consulta e exame sem cadastro não têm preparo", () => {
    expect(findExamPreparation({ type: "consulta" }, [ULTRASSOM])).toBeNull();
    expect(
      findExamPreparation({ type: "exame", examName: "Raio-X de tórax" }, [ULTRASSOM]),
    ).toBeNull();
  });

  it("traduz os itens não cumpridos em rótulos e mostra o id do que não está no cadastro", () => {
    expect(missedItemLabels([BEXIGA, "item-removido"], ULTRASSOM)).toEqual([
      "Bexiga cheia",
      "item-removido",
    ]);
    expect(missedItemLabels([JEJUM], null)).toEqual([JEJUM]);
  });
});

describe("status do preparo", () => {
  it("consulta não tem status de preparo", () => {
    const consulta = examAppointment({ procedure: { type: "consulta" } });
    expect(preparationStatusFor(consulta, [ULTRASSOM])).toBeNull();
  });

  it.each<AppointmentStatus>(["pendente", "confirmado"])(
    "exame %s sem resposta fica pendente",
    (status) => {
      expect(preparationStatusFor(examAppointment({ status }), [ULTRASSOM])).toBe(
        "pendente",
      );
    },
  );

  it.each<AppointmentStatus>(["compareceu", "faltou", "liberado", "remarcacao_solicitada"])(
    "exame %s sem resposta não vira preparo pendente",
    (status) => {
      expect(getPreparationStatus(examAppointment({ status }), true)).toBeNull();
    },
  );

  it("resposta gravada vale mesmo sem o cadastro e na vaga já liberada", () => {
    const released = examAppointment({
      status: "liberado",
      preparation: { result: "nao_cumprido", missedItemIds: [JEJUM], answeredAt: ANSWERED_AT },
    });
    expect(preparationStatusFor(released, [])).toBe("nao_cumprido");
  });

  it("sem cadastro, exame sem resposta não aparece como pendente", () => {
    expect(preparationStatusFor(examAppointment(), [])).toBeNull();
  });

  it("aguarda liberação só quem não cumpre o preparo e ainda ocupa a vaga", () => {
    const missed = {
      result: "nao_cumprido" as const,
      missedItemIds: [JEJUM],
      answeredAt: ANSWERED_AT,
    };
    expect(isAwaitingPreparationRelease(examAppointment({ preparation: missed }))).toBe(true);
    expect(
      isAwaitingPreparationRelease(
        examAppointment({ status: "liberado", preparation: missed }),
      ),
    ).toBe(false);
    expect(
      isAwaitingPreparationRelease(
        examAppointment({
          preparation: { result: "ok", missedItemIds: [], answeredAt: ANSWERED_AT },
        }),
      ),
    ).toBe(false);
    expect(isAwaitingPreparationRelease(examAppointment())).toBe(false);
  });
});

describe("answerPreparationChecklist", () => {
  it("todas as respostas sim deixam o preparo ok", () => {
    const answered = answerPreparationChecklist(
      examAppointment(),
      ULTRASSOM,
      { [JEJUM]: true, [BEXIGA]: true },
      ANSWERED_AT,
    );

    expect(answered.preparation).toEqual({
      result: "ok",
      missedItemIds: [],
      answeredAt: ANSWERED_AT,
    });
    expect(answered.status).toBe("pendente");
  });

  it("um não marca o preparo como não cumprido e guarda os itens na ordem do checklist", () => {
    const answered = answerPreparationChecklist(
      examAppointment(),
      ULTRASSOM,
      { [BEXIGA]: false, [JEJUM]: false },
      ANSWERED_AT,
    );

    expect(answered.preparation).toEqual({
      result: "nao_cumprido",
      missedItemIds: [JEJUM, BEXIGA],
      answeredAt: ANSWERED_AT,
    });
  });

  it("não altera o agendamento recebido", () => {
    const appointment = examAppointment();
    answerPreparationChecklist(
      appointment,
      ULTRASSOM,
      { [JEJUM]: true, [BEXIGA]: false },
      ANSWERED_AT,
    );
    expect(appointment.preparation).toBeNull();
  });

  it("exige resposta para todos os itens, citando o que falta", () => {
    const error = expectPreparationError(
      () => answerPreparationChecklist(examAppointment(), ULTRASSOM, { [JEJUM]: true }, ANSWERED_AT),
      "INVALID_ANSWERS",
    );
    expect(error.message).toContain("Bexiga cheia");
  });

  it("recusa item que não faz parte do preparo", () => {
    const error = expectPreparationError(
      () =>
        answerPreparationChecklist(
          examAppointment(),
          ULTRASSOM,
          { [JEJUM]: true, [BEXIGA]: true, "item-falso": true },
          ANSWERED_AT,
        ),
      "INVALID_ANSWERS",
    );
    expect(error.message).toContain("item-falso");
  });

  it.each([["sim"], [1], [null]])("recusa resposta que não é booleana (%j)", (value) => {
    expectPreparationError(
      () =>
        answerPreparationChecklist(
          examAppointment(),
          ULTRASSOM,
          { [JEJUM]: true, [BEXIGA]: value },
          ANSWERED_AT,
        ),
      "INVALID_ANSWERS",
    );
  });

  it("não deixa responder duas vezes", () => {
    const appointment = examAppointment({
      preparation: { result: "ok", missedItemIds: [], answeredAt: ANSWERED_AT },
    });
    expectPreparationError(
      () =>
        answerPreparationChecklist(
          appointment,
          ULTRASSOM,
          { [JEJUM]: false, [BEXIGA]: false },
          ANSWERED_AT,
        ),
      "ALREADY_ANSWERED",
    );
  });

  it.each<AppointmentStatus>(["liberado", "remarcacao_solicitada", "compareceu", "faltou"])(
    "recusa vaga %s",
    (status) => {
      expectPreparationError(
        () =>
          answerPreparationChecklist(
            examAppointment({ status }),
            ULTRASSOM,
            { [JEJUM]: true, [BEXIGA]: true },
            ANSWERED_AT,
          ),
        "SLOT_NOT_ACTIVE",
      );
    },
  );

  it("recusa preparo de outro exame e consulta", () => {
    for (const procedure of [
      { type: "exame" as const, examName: "Glicemia em jejum" },
      { type: "consulta" as const },
    ]) {
      expectPreparationError(
        () =>
          answerPreparationChecklist(
            examAppointment({ procedure }),
            ULTRASSOM,
            { [JEJUM]: true, [BEXIGA]: true },
            ANSWERED_AT,
          ),
        "NO_PREPARATION_REQUIRED",
      );
    }
  });
});

describe("releaseSlotForMissedPreparation", () => {
  const missed = {
    result: "nao_cumprido" as const,
    missedItemIds: [BEXIGA],
    answeredAt: ANSWERED_AT,
  };

  it.each<AppointmentStatus>(["pendente", "confirmado"])(
    "libera a vaga %s e mantém a resposta que explica o motivo",
    (status) => {
      const released = releaseSlotForMissedPreparation(
        examAppointment({ status, preparation: missed }),
      );
      expect(released.status).toBe("liberado");
      expect(released.preparation).toEqual(missed);
    },
  );

  it("recusa quem não marcou o preparo como não cumprido", () => {
    expectPreparationError(
      () => releaseSlotForMissedPreparation(examAppointment()),
      "PREPARATION_NOT_MISSED",
    );
    expectPreparationError(
      () =>
        releaseSlotForMissedPreparation(
          examAppointment({
            preparation: { result: "ok", missedItemIds: [], answeredAt: ANSWERED_AT },
          }),
        ),
      "PREPARATION_NOT_MISSED",
    );
  });

  it("recusa liberar de novo uma vaga que já não está ativa", () => {
    expectPreparationError(
      () =>
        releaseSlotForMissedPreparation(
          examAppointment({ status: "liberado", preparation: missed }),
        ),
      "SLOT_NOT_ACTIVE",
    );
  });
});
