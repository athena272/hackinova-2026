import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Appointment } from "@/domain/appointment";
import type { PreparationStatus } from "@/domain/exam-preparation";
import {
  BEXIGA,
  examAppointment,
  JEJUM,
  ULTRASSOM,
} from "@/domain/exam-preparation/exam-preparation.test-utils";
import type { ExamPreparationsState } from "@/hooks/use-exam-preparations";
import { AppointmentTable } from "./AppointmentTable";
import { MockPreparationChecklist } from "./MockPreparationChecklist";
import { PreparationAlerts } from "./PreparationAlerts";
import { PreparationBadge } from "./PreparationBadge";

const ANSWERED_AT = "2026-10-18T15:00:00.000Z";

const missed = (missedItemIds: string[]) => ({
  result: "nao_cumprido" as const,
  missedItemIds,
  answeredAt: ANSWERED_AT,
});

describe("PreparationBadge", () => {
  it.each<[PreparationStatus, string]>([
    ["pendente", "Preparo pendente"],
    ["ok", "Preparo ok"],
    ["nao_cumprido", "Preparo não cumprido"],
  ])("mostra %s com rótulo e classe próprios", (status, label) => {
    const html = renderToStaticMarkup(createElement(PreparationBadge, { status }));

    expect(html).toContain(label);
    expect(html).toContain(`badge-prep-${status}`);
  });
});

describe("AppointmentTable com preparo", () => {
  const appointments = [
    examAppointment({ id: "apt-007", patientName: "Lia Costa" }),
    examAppointment({ id: "apt-001", procedure: { type: "consulta" } }),
  ];

  it("mostra o badge só de quem tem status de preparo", () => {
    const html = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments,
        preparationStatusById: new Map([["apt-007", "pendente" as const]]),
      }),
    );

    expect(html.match(/badge-prep-/g)).toHaveLength(1);
    expect(html).toContain("Preparo pendente");
  });

  it("sem o mapa de preparo, a tabela fica como antes", () => {
    const html = renderToStaticMarkup(createElement(AppointmentTable, { appointments }));

    expect(html).not.toContain("badge-prep-");
  });

  it("vaga liberada por preparo aparece como reaproveitável e com o motivo", () => {
    const released = examAppointment({ status: "liberado", preparation: missed([JEJUM]) });

    const html = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments: [released],
        slotOffers: { cascadeByAppointment: new Map(), loading: false, onChanged: vi.fn() },
        preparationStatusById: new Map([[released.id, "nao_cumprido" as const]]),
      }),
    );

    expect(html).toContain("Vaga reaproveitável");
    expect(html).toContain("Preparo não cumprido");
  });
});

describe("PreparationAlerts", () => {
  const render = (appointments: Appointment[], preparations = [ULTRASSOM]) =>
    renderToStaticMarkup(
      createElement(PreparationAlerts, { appointments, preparations, onReleased: vi.fn() }),
    );

  it("alerta quem respondeu não cumpri e ainda ocupa a vaga, com os itens e o botão", () => {
    const html = render([examAppointment({ preparation: missed([JEJUM, BEXIGA]) })]);

    expect(html).toContain("Preparo não cumprido");
    expect(html).toContain("Marcos Lima");
    expect(html).toContain("Não vai cumprir: Jejum de 8 horas, Bexiga cheia");
    expect(html).toContain("Liberar vaga");
  });

  it("sem o cadastro, mostra o id do item no lugar do rótulo", () => {
    const html = render([examAppointment({ preparation: missed([BEXIGA]) })], []);

    expect(html).toContain(`Não vai cumprir: ${BEXIGA}`);
  });

  it("não renderiza nada sem pendências de liberação", () => {
    expect(
      render([
        examAppointment(),
        examAppointment({ status: "liberado", preparation: missed([JEJUM]) }),
        examAppointment({
          preparation: { result: "ok", missedItemIds: [], answeredAt: ANSWERED_AT },
        }),
      ]),
    ).toBe("");
  });
});

describe("MockPreparationChecklist", () => {
  const render = (appointments: Appointment[], preparations: ExamPreparationsState) =>
    renderToStaticMarkup(
      createElement(MockPreparationChecklist, {
        appointments,
        preparations,
        onRetryPreparations: vi.fn(),
        onAnswered: vi.fn(),
      }),
    );
  const ready: ExamPreparationsState = { status: "ready", data: [ULTRASSOM] };

  it("mostra carregamento enquanto busca o cadastro", () => {
    expect(render([examAppointment()], { status: "loading" })).toContain(
      "Carregando checklist…",
    );
  });

  it("mostra o erro do cadastro com opção de tentar de novo", () => {
    const html = render([examAppointment()], { status: "error", message: "timeout" });

    expect(html).toContain("timeout");
    expect(html).toContain("Tentar de novo");
  });

  it("lista só exames com preparo pendente e abre o primeiro com instruções e perguntas", () => {
    const html = render(
      [
        examAppointment({ id: "apt-007", patientName: "Lia Costa" }),
        examAppointment({ id: "apt-001", patientName: "Ana Souza", procedure: { type: "consulta" } }),
        examAppointment({
          id: "apt-004",
          patientName: "Davi Rocha",
          status: "confirmado",
          preparation: { result: "ok", missedItemIds: [], answeredAt: ANSWERED_AT },
        }),
      ],
      ready,
    );

    expect(html).toContain("Lia Costa");
    expect(html).not.toContain("Ana Souza");
    expect(html).not.toContain("Davi Rocha");
    expect(html).toContain(ULTRASSOM.instructions);
    for (const item of ULTRASSOM.items) {
      expect(html).toContain(item.question);
    }
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(ULTRASSOM.items.length * 2);
  });

  it("só libera o envio depois de responder todos os itens", () => {
    const html = render([examAppointment()], ready);
    const sendButton = html.slice(html.lastIndexOf("<button"), html.indexOf("Enviar respostas"));

    expect(html).toContain("Enviar respostas");
    expect(sendButton).toContain("disabled");
  });

  it("avisa quando não há checklist pendente", () => {
    expect(render([examAppointment({ procedure: { type: "consulta" } })], ready)).toContain(
      "Nenhum exame aguardando o checklist.",
    );
  });
});
