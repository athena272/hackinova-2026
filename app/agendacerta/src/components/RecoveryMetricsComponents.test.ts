import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { computeRecoveryMetrics, type RecoveredSlot } from "@/domain/recovery-metrics";
import { DEMO_WEEK, SEPTEMBER, recoveredSlot } from "@/domain/recovery-metrics/recovery-metrics.test-utils";
import { slotAppointment } from "@/domain/slot-offer/slot-offer.test-utils";
import type { RecoveryMetricsState } from "@/hooks/use-recovery-metrics";
import { RecoveryMetricsView } from "./RecoveryMetricsSummary";
import { periodLabel, RecoveryPeriodFilter } from "./RecoveryPeriodFilter";

const plain = (html: string) => html.replace(/\u00a0/g, " ");

const render = (metrics: RecoveryMetricsState) =>
  plain(renderToStaticMarkup(createElement(RecoveryMetricsView, { metrics, onRetry: vi.fn() })));

const ready = (
  recoveredSlots: RecoveredSlot[],
  appointments = [slotAppointment({ status: "faltou", scheduledAt: "2026-09-22T12:00:00.000Z" })],
): RecoveryMetricsState => ({
  status: "ready",
  data: computeRecoveryMetrics({ recoveredSlots, appointments, period: DEMO_WEEK }),
});

const demoSlots = [
  recoveredSlot(),
  recoveredSlot({ origin: "preparo", procedureType: "exame", patientId: "pat-nelson" }),
  recoveredSlot({ origin: "booking_duplo", patientId: "pat-lucas" }),
  recoveredSlot({ origin: "overbooking", patientId: "pat-helena" }),
];

describe("RecoveryMetricsView", () => {
  it("mostra o carregamento enquanto calcula", () => {
    expect(render({ status: "loading" })).toContain("Calculando indicadores…");
  });

  it("mostra o erro com opção de tentar de novo", () => {
    const html = render({ status: "error", message: "timeout" });

    expect(html).toContain("Indicadores indisponíveis.");
    expect(html).toContain("timeout");
    expect(html).toContain("Tentar de novo");
  });

  it("período sem nenhum dado mostra o estado vazio com a dica das setas", () => {
    const html = render(ready([], []));

    expect(html).toContain("Ainda não há dados neste período.");
    expect(html).toContain("Use as setas");
    expect(html).not.toContain("Vagas recuperadas");
  });

  it("com faltas e sem recuperação, mostra os cartões zerados e avisa", () => {
    const html = render(ready([]));

    expect(html).toContain("Nenhuma vaga recuperada neste período.");
    expect(html).toContain("R$ 0");
    expect(html).toContain("100%");
    expect(html).toContain("1 falta em 1 atendimento");
  });

  it("sem atendimento encerrado, o cartão da taxa explica a ausência", () => {
    const html = render(ready([recoveredSlot()], []));

    expect(html).toContain("Sem comparecimentos registrados no período.");
  });

  it("mostra total, valor, lista de espera, cada origem e os preços usados", () => {
    const html = render(ready(demoSlots));

    expect(html).toContain("R$ 750");
    for (const label of ["Leilão", "Preparo", "Booking duplo", "Overbooking"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("width:25%");
    expect(html).toContain("Lista de espera atendida");
    expect(html).toContain("R$ 200 por consulta");
    expect(html).toContain("R$ 150 por exame");
  });
});

describe("RecoveryPeriodFilter", () => {
  it("rotula semana, semana na virada do ano e mês", () => {
    expect(periodLabel(DEMO_WEEK)).toBe("21/09 a 27/09/2026");
    expect(periodLabel({ kind: "semana", start: "2026-12-28", end: "2027-01-03" })).toBe(
      "28/12/2026 a 03/01/2027",
    );
    expect(periodLabel(SEPTEMBER)).toBe("setembro de 2026");
  });

  it("marca o agrupamento ativo e nomeia as setas pelo período", () => {
    const html = renderToStaticMarkup(
      createElement(RecoveryPeriodFilter, { period: SEPTEMBER, today: "2026-09-24", onChange: vi.fn() }),
    );

    expect(html).toContain('aria-pressed="true" class="active">Mês');
    expect(html).toContain('aria-pressed="false">Semana');
    expect(html).toContain('aria-label="Mês anterior"');
    expect(html).toContain('aria-label="Próximo mês"');
    expect(html).toContain("setembro de 2026");
  });
});
