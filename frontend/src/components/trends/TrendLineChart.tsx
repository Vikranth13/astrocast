import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatUtc,
  formatUtcDay,
} from "../../utils/format";

import "./trends.css";

export type ChartPoint = {
  observed_at: string;
  value: number | null;
};

type Threshold = {
  value: number;
  label: string;
};

type TrendLineChartProps = {
  title: string;
  points: ChartPoint[];
  unit: string;
  curve?: "monotone" | "stepAfter";
  yDomain?: [number, number];
  yTicks?: number[];
  thresholds?: Threshold[];
  formatValue?: (value: number) => string;
};

type MeasuredPoint = {
  observed_at: string;
  value: number;
};

const CHART_HEIGHT = 260;

const MISSING_VALUE = "—";

const AXIS_TICK = {
  fill: "var(--color-text-muted)",
  fontSize: 12,
};

function defaultFormat(
  value: number
): string {
  return String(value);
}

function isMidnightUtc(
  timestamp: string
): boolean {
  const date = new Date(timestamp);

  return (
    date.getUTCHours() === 0
    && date.getUTCMinutes() === 0
  );
}

function TrendLineChart({
  title,
  points,
  unit,
  curve = "monotone",
  yDomain,
  yTicks,
  thresholds = [],
  formatValue = defaultFormat,
}: TrendLineChartProps) {
  function withUnit(
    value: number
  ): string {
    return unit
      ? `${formatValue(value)} ${unit}`
      : formatValue(value);
  }

  const measured = points.filter(
    (point): point is MeasuredPoint =>
      point.value !== null
  );

  const missingCount =
    points.length - measured.length;

  const latest = measured[measured.length - 1];

  let summary =
    "No measurements were stored for this period.";

  if (latest) {
    const values = measured.map(
      (point) => point.value
    );

    const missingNote = missingCount > 0
      ? `, with ${missingCount} missing`
      : "";

    summary = (
      `Latest ${withUnit(latest.value)} at `
      + `${formatUtc(latest.observed_at)}. `
      + `Ranged from ${formatValue(Math.min(...values))} `
      + `to ${withUnit(Math.max(...values))} `
      + `across ${measured.length} readings`
      + `${missingNote}.`
    );
  }

  const dayTicks = points
    .filter((point) =>
      isMidnightUtc(point.observed_at)
    )
    .map((point) => point.observed_at);

  return (
    <figure className="trend-chart">
      <div
        role="img"
        aria-label={`${title}. ${summary}`}
      >
        <ResponsiveContainer
          width="100%"
          height={CHART_HEIGHT}
        >
          <LineChart
            data={points}
            margin={{
              top: 16,
              right: 16,
              bottom: 0,
              left: 0,
            }}
          >
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="observed_at"
              ticks={
                dayTicks.length > 1
                  ? dayTicks
                  : undefined
              }
              tickFormatter={formatUtcDay}
              stroke="var(--color-border-strong)"
              tick={AXIS_TICK}
            />

            <YAxis
              domain={yDomain ?? ["auto", "auto"]}
              ticks={yTicks}
              stroke="var(--color-border-strong)"
              tick={AXIS_TICK}
              width={44}
            />

            <Tooltip
              labelFormatter={(label) =>
                formatUtc(String(label))
              }
              formatter={(value) => [
                withUnit(Number(value)),
                title,
              ]}
              contentStyle={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border-strong)",
                borderRadius: 8,
              }}
              labelStyle={{
                color: "var(--color-text-muted)",
              }}
              itemStyle={{
                color: "var(--color-text)",
              }}
            />

            {thresholds.map((threshold) => (
              <ReferenceLine
                key={threshold.label}
                y={threshold.value}
                stroke="var(--tone-caution-text)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={{
                  value: threshold.label,
                  position: "insideTopLeft",
                  fill: "var(--tone-caution-text)",
                  fontSize: 11,
                }}
              />
            ))}

            <Line
              type={curve}
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="trend-summary">
        {summary}
      </figcaption>

      <details className="trend-data">
        <summary>Show data table</summary>

        <div className="trend-data-scroll">
          <table aria-label={`${title} readings`}>
            <thead>
              <tr>
                <th scope="col">Time</th>

                <th scope="col">
                  {unit ? `${title} (${unit})` : title}
                </th>
              </tr>
            </thead>

            <tbody>
              {points.map((point) => (
                <tr key={point.observed_at}>
                  <th scope="row">
                    {formatUtc(point.observed_at)}
                  </th>

                  <td>
                    {point.value === null
                      ? MISSING_VALUE
                      : formatValue(point.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export default TrendLineChart;
