import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SlotOfferCascade } from "@/domain/slot-offer";
import {
  pendingOffer,
  slotAppointment,
} from "@/domain/slot-offer/slot-offer.test-utils";
import type { SlotOffersState } from "@/hooks/use-slot-offers";
import { AppointmentTable } from "./AppointmentTable";
import { MockSlotOfferThread } from "./MockSlotOfferThread";
import { OfferCountdown } from "./OfferCountdown";
import { SlotOfferActions } from "./SlotOfferActions";
import { SlotOfferHistory } from "./SlotOfferHistory";

/** Três minutos e meio depois da oferta de 15 min: faltam 11:30. */
const NOW = "2026-10-06T15:03:30.000Z";

const ongoing: SlotOfferCascade = {
  appointmentId: "apt-006",
  offers: [
    pendingOffer({
      id: "offer-0",
      status: "expirada",
      closedAt: "2026-10-06T15:00:00.000Z",
      offeredAt: "2026-10-06T14:45:00.000Z",
      expiresAt: "2026-10-06T15:00:00.000Z",
      candidate: { waitlistId: "wl-008", patientId: "pat-elena", patientName: "Elena Rocha" },
      distanceKm: 13,
    }),
    pendingOffer(),
  ],
  state: "em_andamento",
};

const ended: SlotOfferCascade = {
  appointmentId: "apt-006",
  offers: [
    pendingOffer({ status: "recusada", closedAt: "2026-10-06T15:01:00.000Z" }),
    pendingOffer({ id: "offer-2", status: "expirada", closedAt: "2026-10-06T15:16:00.000Z" }),
  ],
  state: "encerrada",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OfferCountdown", () => {
  it("mostra o tempo restante em mm:ss", () => {
    const html = renderToStaticMarkup(
      createElement(OfferCountdown, { expiresAt: "2026-10-06T15:15:00.000Z" }),
    );

    expect(html).toContain("11:30");
    expect(html).toContain('role="timer"');
  });

  it("avisa quando o prazo acabou", () => {
    const html = renderToStaticMarkup(
      createElement(OfferCountdown, { expiresAt: "2026-10-06T15:00:00.000Z" }),
    );

    expect(html).toContain("prazo encerrado");
    expect(html).toContain("offer-countdown-over");
  });
});

describe("SlotOfferActions", () => {
  const render = (props: Partial<Parameters<typeof SlotOfferActions>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(SlotOfferActions, {
        appointment: slotAppointment(),
        onChanged: vi.fn(),
        ...props,
      }),
    );

  it("sem oferta, mostra o seletor de prazo com 15 min escolhido e o botão", () => {
    const html = render();

    expect(html).toContain("Iniciar oferta");
    for (const option of ["2 min", "5 min", "15 min", "30 min"]) {
      expect(html).toContain(option);
    }
    expect(html).toMatch(/<option value="15" selected="">15 min<\/option>/);
  });

  it("com oferta em aberto, mostra para quem foi, a distância e a contagem", () => {
    const html = render({ cascade: ongoing });

    expect(html).toContain("Oferecida a <strong>Igor Santos</strong>");
    expect(html).toContain("3,7 km");
    expect(html).toContain("11:30");
    expect(html).not.toContain("Iniciar oferta");
  });

  it("com a cascata encerrada sem aceite, avisa e permite tentar de novo", () => {
    const html = render({ cascade: ended });

    expect(html).toContain("Ninguém aceitou: 2 ofertas encerradas");
    expect(html).toContain("Iniciar oferta");
  });

  it("enquanto o histórico carrega, mostra o carregamento", () => {
    const html = render({ loading: true });

    expect(html).toContain("Verificando ofertas…");
    expect(html).not.toContain("Iniciar oferta");
  });
});

describe("AppointmentTable com oferta em cascata", () => {
  it("vaga reaproveitável ganha as ações da oferta só quando a tabela recebe slotOffers", () => {
    const appointments = [slotAppointment()];
    const withOffers = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments,
        slotOffers: { cascadeByAppointment: new Map(), loading: false, onChanged: vi.fn() },
      }),
    );
    const without = renderToStaticMarkup(createElement(AppointmentTable, { appointments }));

    expect(withOffers).toContain("Iniciar oferta");
    expect(without).toContain("Vaga reaproveitável");
    expect(without).not.toContain("Iniciar oferta");
  });
});

describe("SlotOfferHistory", () => {
  const render = (
    offers: SlotOffersState,
    extra: { refreshing?: boolean; refreshError?: string | null } = {},
  ) =>
    renderToStaticMarkup(
      createElement(SlotOfferHistory, {
        offers,
        refreshing: extra.refreshing ?? false,
        refreshError: extra.refreshError ?? null,
        appointments: [slotAppointment()],
        onRetry: vi.fn(),
        onRefresh: vi.fn(),
      }),
    );

  it("mostra o carregamento inicial", () => {
    expect(render({ status: "loading" })).toContain("Carregando histórico…");
  });

  it("mostra o erro com opção de tentar de novo", () => {
    const html = render({ status: "error", message: "timeout" });

    expect(html).toContain("timeout");
    expect(html).toContain("Tentar de novo");
  });

  it("ao atualizar, mantém o histórico na tela e mostra o aviso", () => {
    const html = render({ status: "ready", data: [ongoing] }, { refreshing: true });

    expect(html).toContain("Atualizando…");
    expect(html).toContain("Igor Santos");
  });

  it("se a atualização falhar, mantém o histórico e mostra o motivo", () => {
    const html = render({ status: "ready", data: [ongoing] }, { refreshError: "sem rede" });

    expect(html).toContain("Não foi possível atualizar: sem rede");
    expect(html).toContain("Igor Santos");
  });

  it("lista cada oferta com distância, prazo e o que aconteceu", () => {
    const html = render({ status: "ready", data: [ongoing] });

    expect(html).toContain("Endocrinologia");
    expect(html).toContain("Em andamento");
    expect(html).toContain("Elena Rocha");
    expect(html).toContain("13 km");
    expect(html).toContain("não respondeu a tempo");
    expect(html).toContain("aguardando resposta");
    expect(html).toContain("(15 min)");
    expect(html.indexOf("Elena Rocha")).toBeLessThan(html.indexOf("Igor Santos"));
  });

  it("indica cascata encerrada sem aceite e vaga preenchida", () => {
    const filled: SlotOfferCascade = {
      appointmentId: "apt-099",
      offers: [pendingOffer({ id: "offer-9", appointmentId: "apt-099", status: "aceita", closedAt: NOW })],
      state: "aceita",
    };
    const html = render({ status: "ready", data: [filled, ended] });

    expect(html).toContain("Vaga preenchida");
    expect(html).toContain("aceitou");
    expect(html).toContain("Encerrada sem aceite");
    expect(html).toContain("recusou");
    expect(html).toContain("Vaga apt-099");
  });

  it("sem ofertas, explica como começar", () => {
    expect(render({ status: "ready", data: [] })).toContain("Nenhuma oferta feita ainda.");
  });
});

describe("MockSlotOfferThread", () => {
  const render = (offers: SlotOffersState) =>
    renderToStaticMarkup(
      createElement(MockSlotOfferThread, {
        offers,
        appointments: [slotAppointment()],
        onRetry: vi.fn(),
        onRefresh: vi.fn(),
        onResponded: vi.fn(),
      }),
    );

  it("mostra carregamento e erro com opção de tentar de novo", () => {
    expect(render({ status: "loading" })).toContain("Carregando ofertas…");
    const html = render({ status: "error", message: "timeout" });
    expect(html).toContain("timeout");
    expect(html).toContain("Tentar de novo");
  });

  it("abre a oferta pendente com a mensagem, a contagem e os botões", () => {
    const html = render({ status: "ready", data: [ongoing] });

    expect(html).toContain("Olá, Igor Santos! Surgiu uma vaga de Endocrinologia");
    expect(html).toContain("Responda até");
    expect(html).toContain("11:30");
    expect(html).toContain("Aceitar");
    expect(html).toContain("Recusar");
    expect(html).not.toContain("Elena Rocha");
  });

  it("sem oferta aberta, orienta a iniciar pelo painel", () => {
    expect(render({ status: "ready", data: [ended] })).toContain("Nenhuma oferta aberta.");
  });
});
