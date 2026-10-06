import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "@/domain/appointment";
import type { NoShowRisk } from "@/domain/no-show-risk";
import type { NoShowRisksState } from "@/hooks/use-no-show-risks";
import { NoShowRiskCell } from "./NoShowRiskCell";

const risk: NoShowRisk = {
  appointmentId: "apt-001",
  probability: 64,
  band: "alto",
  reasons: [
    { factor: "historico", points: 25, description: "Faltou 2 das últimas 3 consultas" },
    { factor: "antecedencia", points: 12, description: "Marcado com 40 dias de antecedência" },
    { factor: "distancia", points: 6, description: "Mora a cerca de 9 km da clínica" },
    { factor: "dia_horario", points: 0, description: "Terça-feira às 9h00, sem risco adicional" },
  ],
};

function render(risks: NoShowRisksState, status: AppointmentStatus = "pendente") {
  return renderToStaticMarkup(
    createElement(NoShowRiskCell, { appointment: { id: "apt-001", status }, risks }),
  );
}

const ready = (items: NoShowRisk[]): NoShowRisksState => ({
  status: "ready",
  risksById: new Map(items.map((item) => [item.appointmentId, item])),
});

describe("NoShowRiskCell", () => {
  it("mostra percentual, faixa e os 2 motivos de maior impacto", () => {
    const html = render(ready([risk]));

    expect(html).toContain("64% · Alto");
    expect(html).toContain("risk-alto");

    const summary = html.slice(0, html.indexOf("<details"));
    expect(summary).toContain("Faltou 2 das últimas 3 consultas");
    expect(summary).toContain("Marcado com 40 dias de antecedência");
    expect(summary).not.toContain("Mora a cerca de 9 km da clínica");
  });

  it("lista todos os motivos com os pontos em 'ver todos os motivos'", () => {
    const details = render(ready([risk])).split("<details")[1];

    expect(details).toContain("ver todos os motivos");
    expect(details).toContain("Mora a cerca de 9 km da clínica");
    expect(details).toContain("+25 pts");
    expect(details).toContain("0 pts");
  });

  it("mostra carregamento enquanto o risco é calculado", () => {
    expect(render({ status: "loading" })).toContain("Calculando risco…");
  });

  it("mostra indisponível quando o cálculo falhou", () => {
    expect(render({ status: "error", message: "timeout" })).toContain("Risco indisponível");
  });

  it.each<AppointmentStatus>(["liberado", "remarcacao_solicitada"])(
    "não mostra score para vaga %s, nem durante o carregamento",
    (status) => {
      expect(render({ status: "loading" }, status)).not.toContain("Calculando");
      expect(render(ready([risk]), status)).not.toContain("%");
    },
  );

  it("mostra traço quando a API não trouxe score para a consulta", () => {
    const html = render(ready([]));
    expect(html).not.toContain("%");
    expect(html).toContain(">-<");
  });
});
