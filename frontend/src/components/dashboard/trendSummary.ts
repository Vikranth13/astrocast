export type MiniTrendPoint = {
  observed_at: string;
  value: number | null;
};

export type MiniTrend = {
  metric: string;
  unit: string;
  decimals: number;
  current: number;
  change: number;
  latestObservedAt: string;
  points: MiniTrendPoint[];
};

// Summarises a short window of stored readings for a mini trend card:
// the latest measured value, when it was observed, and how far it has
// moved since the first measured value in the window. Missing readings
// stay in the points as gaps. Returns null when the window holds no
// measurement at all, so the card can say so instead of showing a zero.
export function summarizeTrend(
  metric: string,
  unit: string,
  decimals: number,
  points: MiniTrendPoint[]
): MiniTrend | null {
  const measured = points.filter(
    (point): point is {
      observed_at: string;
      value: number;
    } => point.value !== null
  );

  const first = measured[0];
  const latest = measured[measured.length - 1];

  if (!first || !latest) {
    return null;
  }

  const precision = 10 ** decimals;

  return {
    metric,
    unit,
    decimals,
    current: latest.value,
    change:
      Math.round((latest.value - first.value) * precision)
      / precision,
    latestObservedAt: latest.observed_at,
    points,
  };
}
