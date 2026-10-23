export type ChartPoint = {
  observed_at: string;
  value: number | null;
};

export type ChartDatum = {
  t: number;
  value: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;

// Turns the points into chart data on a numeric time axis. Where two
// readings are further apart than maxGapMinutes, an empty point is put
// between them, so the line breaks there rather than drawing a slope
// across hours that hold no data.
export function buildChartData(
  points: ChartPoint[],
  maxGapMinutes?: number
): ChartDatum[] {
  const data: ChartDatum[] = [];

  let previous: ChartDatum | null = null;

  for (const point of points) {
    const datum = {
      t: Date.parse(point.observed_at),
      value: point.value,
    };

    if (
      maxGapMinutes !== undefined
      && previous !== null
      && datum.t - previous.t > maxGapMinutes * MINUTE_MS
    ) {
      data.push({
        t: previous.t + 1,
        value: null,
      });
    }

    data.push(datum);

    previous = datum;
  }

  return data;
}

// Midnight UTC of every day inside the window, for the axis labels.
export function dayTicksBetween(
  startMs: number,
  endMs: number
): number[] {
  const ticks: number[] = [];

  const first = Math.ceil(startMs / DAY_MS) * DAY_MS;

  for (let tick = first; tick <= endMs; tick += DAY_MS) {
    ticks.push(tick);
  }

  return ticks;
}
