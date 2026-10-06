/**
 * Pesos do score de falta, em pontos percentuais somados à probabilidade base.
 * São hipóteses iniciais para a demonstração, não valores calibrados com dados
 * reais: ajuste aqui (único lugar com números) quando houver histórico de clínica.
 */
export type NoShowRiskWeights = {
  baseProbability: number;
  minProbability: number;
  maxProbability: number;
  /** Probabilidade mínima de cada faixa; abaixo de `medium` é baixo. */
  bands: { medium: number; high: number };
  history: {
    /** Quantas consultas anteriores (as mais recentes) entram na conta. */
    window: number;
    high: { minNoShowRate: number; points: number };
    medium: { minNoShowRate: number; points: number };
    /** Sem faltas em pelo menos `minOutcomes` consultas. */
    reliable: { minOutcomes: number; points: number };
  };
  /** Especialidades fora da lista não somam pontos. */
  specialty: Readonly<Record<string, number>>;
  schedule: {
    /** 0 = domingo ... 6 = sábado. */
    riskyWeekdays: readonly number[];
    weekdayPoints: number;
    earlyBeforeHour: number;
    lateFromHour: number;
    offHoursPoints: number;
  };
  leadTime: {
    long: { minDays: number; points: number };
    medium: { minDays: number; points: number };
    short: { maxDays: number; points: number };
  };
  distance: {
    far: { minKm: number; points: number };
    medium: { minKm: number; points: number };
    near: { maxKm: number; points: number };
  };
};

export const NO_SHOW_RISK_WEIGHTS: NoShowRiskWeights = {
  baseProbability: 15,
  minProbability: 3,
  maxProbability: 95,
  bands: { medium: 25, high: 50 },
  history: {
    window: 3,
    high: { minNoShowRate: 0.6, points: 25 },
    medium: { minNoShowRate: 0.3, points: 10 },
    reliable: { minOutcomes: 2, points: -8 },
  },
  specialty: {
    Oftalmologia: 8,
    Neurologia: 6,
    Endocrinologia: 6,
    Ultrassonografia: 4,
  },
  schedule: {
    riskyWeekdays: [1, 5],
    weekdayPoints: 4,
    earlyBeforeHour: 8,
    lateFromHour: 17,
    offHoursPoints: 4,
  },
  leadTime: {
    long: { minDays: 30, points: 12 },
    medium: { minDays: 14, points: 6 },
    short: { maxDays: 2, points: -4 },
  },
  distance: {
    far: { minKm: 15, points: 12 },
    medium: { minKm: 7, points: 6 },
    near: { maxKm: 3, points: -3 },
  },
};
