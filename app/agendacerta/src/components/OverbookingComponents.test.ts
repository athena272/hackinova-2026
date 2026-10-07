import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { findOverbookingSuggestions, type OverbookingSuggestion } from "@/domain/overbooking";
import {
  appointment,
  risk,
  risksOf,
  waitingCandidate,
} from "@/domain/overbooking/overbooking.test-utils";
import { slotAppointment } from "@/domain/slot-offer/slot-offer.test-utils";
import type { OverbookingsState } from "@/hooks/use-overbookings";
import { AppointmentTable } from "./AppointmentTable";
import { OverbookingDecisionButtons, OverbookingSuggestions } from "./OverbookingSuggestions";
import { RiskReasons } from "./RiskReasons";
import { SlotOfferActions } from "./SlotOfferActions";

const anchorRisk = {
  ...risk("apt-001", "alto", 64),
  reasons: [
    { factor: "historico" as const, points: 25, description: "Faltou 2 das últimas 3 consultas" },
    { factor: "antecedencia" as const, points: 12, description: "Marcado com 40 dias de antecedência" },
    { factor: "distancia" as const, points: 6, description: "Mora a cerca de 9 km da clínica" },
  ],
};

const [suggestion] = findOverbookingSuggestions({
  appointments: [appointment()],
  risksById: risksOf(anchorRisk),
  overbookings: [],
  candidates: [waitingCandidate()],
  busyPatientIds: new Set<string>(),
}) as [OverbookingSuggestion];

const noIds = () => new Set<string>();

function render(overbookings: OverbookingsState, refreshError: string | null = null) {
  return renderToStaticMarkup(
    createElement(OverbookingSuggestions, {
      overbookings,
      refreshError,
      onRetry: vi.fn(),
      onDecided: vi.fn(),
    }),
  );
}

const ready = (suggestions: OverbookingSuggestion[]): OverbookingsState => ({
  status: "ready",
  data: { suggestions, encaixeAppointmentIds: [], coveredAppointmentIds: [] },
});

describe("OverbookingSuggestions", () => {
  it("mostra o carregamento enquanto busca as sugestões", () => {
    expect(render({ status: "loading" })).toContain("Buscando sugestões de encaixe…");
  });

  it("mostra o erro com opção de tentar de novo", () => {
    const html = render({ status: "error", message: "timeout" });

    expect(html).toContain("Sugestões de encaixe indisponíveis.");
    expect(html).toContain("timeout");
    expect(html).toContain("Tentar de novo");
  });

  it("sem sugestão, explica que nenhum horário precisa de encaixe", () => {
    expect(render(ready([]))).toContain(
      "Nenhum horário com risco alto de falta precisa de encaixe agora.",
    );
  });

  it("mostra o bloco, a âncora com o risco, os motivos do score, o limite e o candidato", () => {
    const html = render(ready([suggestion]));

    expect(html).toContain("Neurologia");
    expect(html).toContain("Risco alto de falta: <strong>Ana Souza</strong>");
    expect(html).toContain("64% · Alto");
    expect(html).toContain("risk-alto");
    expect(html).toContain("Faltou 2 das últimas 3 consultas");
    expect(html).toContain("ver todos os motivos");
    expect(html).toContain("0 de 1 encaixe");
    expect(html).toContain("Encaixe para <strong>Helena Dias</strong> (2,1 km)");
    expect(html).toContain("Aceitar encaixe");
    expect(html).toContain("Recusar");
  });

  it("se a atualização falhar, mantém as sugestões e mostra o motivo", () => {
    const html = render(ready([suggestion]), "sem rede");

    expect(html).toContain("Não foi possível atualizar as sugestões: sem rede");
    expect(html).toContain("Helena Dias");
  });
});

describe("OverbookingDecisionButtons", () => {
  const renderButtons = (pending: "aceitar" | "recusar" | null) =>
    renderToStaticMarkup(createElement(OverbookingDecisionButtons, { pending, onDecide: vi.fn() }));

  it("parados, mostram as duas ações habilitadas", () => {
    const html = renderButtons(null);

    expect(html).toContain("Aceitar encaixe");
    expect(html).toContain("Recusar");
    expect(html).not.toContain("disabled");
  });

  it.each([
    ["aceitar", "Aceitando…", "Recusar"],
    ["recusar", "Recusando…", "Aceitar encaixe"],
  ] as const)("ao %s, mostra o carregamento e trava os dois botões", (pending, loading, other) => {
    const html = renderButtons(pending);

    expect(html).toContain(loading);
    expect(html).toContain(other);
    expect(html).toContain("spin");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});

describe("RiskReasons", () => {
  it("mostra os dois motivos de maior impacto e a lista completa com os pontos", () => {
    const html = renderToStaticMarkup(createElement(RiskReasons, { reasons: anchorRisk.reasons }));
    const [summary, details] = html.split("<details");

    expect(summary).toContain("Faltou 2 das últimas 3 consultas");
    expect(summary).toContain("Marcado com 40 dias de antecedência");
    expect(summary).not.toContain("Mora a cerca de 9 km");
    expect(details).toContain("Mora a cerca de 9 km da clínica");
    expect(details).toContain("+6 pts");
  });
});

describe("AppointmentTable com encaixe", () => {
  const slotOffers = { cascadeByAppointment: new Map(), loading: false, onChanged: vi.fn() };

  it("marca o agendamento encaixe com o badge", () => {
    const encaixe = slotAppointment({ id: "apt-enc-1", status: "pendente", patientName: "Helena Dias" });
    const html = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments: [encaixe],
        overbooking: { encaixeIds: new Set(["apt-enc-1"]), coveredIds: noIds() },
      }),
    );

    expect(html).toContain("encaixe-badge");
    expect(html).toContain(">Encaixe<");
  });

  it("vaga coberta pelo encaixe não mostra o botão do leilão", () => {
    const covered = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments: [slotAppointment()],
        slotOffers,
        overbooking: { encaixeIds: noIds(), coveredIds: new Set(["apt-006"]) },
      }),
    );

    expect(covered).toContain("Vaga coberta pelo encaixe; não abre leilão");
    expect(covered).not.toContain("Iniciar oferta");
  });

  it("regressão: sem encaixe, a vaga liberada continua com o botão do leilão e sem badge", () => {
    const html = renderToStaticMarkup(
      createElement(AppointmentTable, {
        appointments: [slotAppointment()],
        slotOffers,
        overbooking: { encaixeIds: noIds(), coveredIds: noIds() },
      }),
    );

    expect(html).toContain("Iniciar oferta");
    expect(html).not.toContain("encaixe-badge");
    expect(html).not.toContain("Vaga coberta");
  });

  it("enquanto verifica, o carregamento vem antes do aviso de vaga coberta", () => {
    const html = renderToStaticMarkup(
      createElement(SlotOfferActions, {
        appointment: slotAppointment(),
        onChanged: vi.fn(),
        loading: true,
        covered: true,
      }),
    );

    expect(html).toContain("Verificando ofertas…");
    expect(html).not.toContain("Vaga coberta");
  });
});
