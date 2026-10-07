import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { type DuplicateAlert, findDuplicateGroups } from "@/domain/duplicate-booking";
import {
  booking,
  CENTRO,
  SENT_AT,
  september,
} from "@/domain/duplicate-booking/duplicate-booking.test-utils";
import { slotAppointment } from "@/domain/slot-offer/slot-offer.test-utils";
import type { DuplicateBookingsState } from "@/hooks/use-duplicate-bookings";
import { AppointmentTable } from "./AppointmentTable";
import {
  DuplicateBookingAlerts,
  duplicateServiceLabel,
  DuplicateSendButton,
} from "./DuplicateBookingAlerts";
import {
  awaitingChecksOf,
  ChosenReply,
  duplicateCheckMessage,
  DuplicateKeepButtons,
  MockDuplicateBookingThread,
} from "./MockDuplicateBookingThread";

const pair = [booking(), booking({ id: "apt-b", scheduledAt: september(24), unit: CENTRO })];
const [group] = findDuplicateGroups(pair);
const newAlert: DuplicateAlert = { ...group!, check: null };
const sentAlert: DuplicateAlert = {
  ...group!,
  check: { id: "dup-1", sentAt: SENT_AT, appointmentIds: ["apt-a", "apt-b"] },
};

const ready = (alerts: DuplicateAlert[], releasedAppointmentIds: string[] = []): DuplicateBookingsState => ({
  status: "ready",
  data: {
    alerts,
    flaggedAppointmentIds: alerts.flatMap((alert) => alert.appointments.map(({ id }) => id)),
    releasedAppointmentIds,
  },
});

describe("DuplicateBookingAlerts", () => {
  const render = (duplicates: DuplicateBookingsState, refreshError: string | null = null) =>
    renderToStaticMarkup(
      createElement(DuplicateBookingAlerts, { duplicates, refreshError, onRetry: vi.fn(), onSent: vi.fn() }),
    );

  it("mostra o carregamento enquanto busca as duplicidades", () => {
    expect(render({ status: "loading" })).toContain("Buscando possíveis duplicidades…");
  });

  it("mostra o erro com opção de tentar de novo", () => {
    const html = render({ status: "error", message: "timeout" });

    expect(html).toContain("Detecção de duplicidade indisponível.");
    expect(html).toContain("timeout");
    expect(html).toContain("Tentar de novo");
  });

  it("sem duplicidade, não ocupa espaço no painel", () => {
    expect(render(ready([]))).toBe("");
  });

  it("mostra o paciente, o serviço, os horários com a unidade e o botão de envio", () => {
    const html = render(ready([newAlert]));

    expect(html).toContain("Possível booking duplo");
    expect(html).toContain("Bruno Lima");
    expect(html).toContain("2 agendamentos de Endocrinologia");
    expect(html).toContain("Unidade Jardins");
    expect(html).toContain("Unidade Centro");
    expect(html).toContain("Enviar confirmação reforçada");
  });

  it("depois do envio, avisa que espera a escolha do paciente e esconde o botão", () => {
    const html = render(ready([sentAlert]));

    expect(html).toContain("Aguardando o paciente escolher no WhatsApp");
    expect(html).not.toContain("Enviar confirmação reforçada");
  });

  it("se a atualização falhar, mantém os alertas e mostra o motivo", () => {
    const html = render(ready([newAlert]), "sem rede");

    expect(html).toContain("Não foi possível atualizar as duplicidades: sem rede");
    expect(html).toContain("Bruno Lima");
  });

  it("exame aparece pelo nome do exame", () => {
    expect(
      duplicateServiceLabel({ specialty: "Radiologia", procedure: { type: "exame", examName: "Ultrassom" } }),
    ).toBe("Ultrassom");
  });
});

describe("DuplicateSendButton", () => {
  const renderButton = (sending: boolean) =>
    renderToStaticMarkup(createElement(DuplicateSendButton, { sending, onSend: vi.fn() }));

  it("parado, fica habilitado", () => {
    const html = renderButton(false);

    expect(html).toContain("Enviar confirmação reforçada");
    expect(html).not.toContain("disabled");
  });

  it("enviando, mostra o carregamento e trava o botão", () => {
    const html = renderButton(true);

    expect(html).toContain("Enviando…");
    expect(html).toContain("spin");
    expect(html).toContain('disabled=""');
  });
});

describe("AppointmentTable com duplicidade", () => {
  const noIds = () => new Set<string>();

  it("marca as possíveis duplicidades e os horários liberados por duplicidade", () => {
    const html = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments: [booking(), booking({ id: "apt-b", status: "liberado" })],
        duplicates: { flaggedIds: new Set(["apt-a"]), releasedIds: new Set(["apt-b"]) },
      }),
    );

    expect(html).toContain("Possível duplicidade");
    expect(html).toContain("Liberado por duplicidade");
  });

  it("mostra a unidade sob a especialidade quando existe", () => {
    const html = renderToStaticMarkup(
      createElement(AppointmentTable, { appointments: [booking({ unit: CENTRO })] }),
    );

    expect(html).toContain("Endocrinologia<div class=\"muted table-unit\">Unidade Centro</div>");
  });

  it("regressão: sem unidade e sem duplicidade, a linha fica como antes", () => {
    const appointments = [slotAppointment()];
    const withEmpty = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments,
        duplicates: { flaggedIds: noIds(), releasedIds: noIds() },
      }),
    );
    const without = renderToStaticMarkup(createElement(AppointmentTable, { appointments }));

    expect(withEmpty).toBe(without);
    expect(without).toContain("<td>Endocrinologia</td>");
    expect(without).not.toContain("duplicidade");
  });
});

describe("MockDuplicateBookingThread", () => {
  const render = (duplicates: DuplicateBookingsState) =>
    renderToStaticMarkup(
      createElement(MockDuplicateBookingThread, {
        duplicates,
        onRetry: vi.fn(),
        onRefresh: vi.fn(),
        onChosen: vi.fn(),
      }),
    );

  it("mostra carregamento e erro com opção de tentar de novo", () => {
    expect(render({ status: "loading" })).toContain("Carregando confirmações reforçadas…");
    const html = render({ status: "error", message: "timeout" });
    expect(html).toContain("timeout");
    expect(html).toContain("Tentar de novo");
  });

  it("sem confirmação enviada, orienta a enviar pelo painel", () => {
    const html = render(ready([newAlert]));

    expect(html).toContain("Nenhuma confirmação reforçada aberta.");
    expect(html).not.toContain("Manter");
  });

  it("abre a confirmação enviada com a mensagem e um botão por horário", () => {
    const html = render(ready([sentAlert]));

    expect(html).toContain("Olá, Bruno. Encontramos dois agendamentos de Endocrinologia");
    expect(html).toContain("Unidade Centro");
    expect(html).toContain("Qual horário você quer manter?");
    expect(html.match(/Manter /g)).toHaveLength(2);
  });

  it("a mensagem lista só os horários perguntados, com a unidade", () => {
    const [item] = awaitingChecksOf([
      { ...sentAlert, check: { ...sentAlert.check!, appointmentIds: ["apt-a", "apt-b"] } },
    ]);

    const message = duplicateCheckMessage(item!);

    expect(message.split("\n")).toHaveLength(4);
    expect(message).toContain("Unidade Jardins");
    expect(message).toContain("O outro fica livre para outro paciente.");
  });

  it("enquanto envia a escolha, trava todos os botões e mostra o carregamento no escolhido", () => {
    const html = renderToStaticMarkup(
      createElement(DuplicateKeepButtons, { slots: pair, pendingId: "apt-b", onKeep: vi.fn() }),
    );

    expect(html).toContain("Enviando…");
    expect(html).toContain("spin");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html.match(/Manter /g)).toHaveLength(1);
  });

  it("a resposta final confirma o horário mantido na unidade e o horário liberado", () => {
    const html = renderToStaticMarkup(
      createElement(ChosenReply, { kept: booking({ status: "confirmado" }), releasedCount: 1 }),
    );

    expect(html).toContain("Quero manter o de");
    expect(html).toContain("na Unidade Jardins está confirmado e liberamos o outro horário");
  });
});
