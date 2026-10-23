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

import {
  MEASUREMENTS,
  formatMeasurementValue,
  formatMeasurementWithUnit,
  type MeasurementKind,
} from "../../utils/measurements";

import {
  buildChartData,
  dayTicksBetween,
  type ChartDatum,
  type ChartPoint,
} from "./chartData";

import "./trends.css";

export type ChartThreshold = {
  value: number;
  label: string;
};

type Noun = {
  one: string;
  many: string;
};

type TrendLineChartProps = {
  title: string;
  points: ChartPoint[];
  measurement: MeasurementKind;
  // The requested window. The time axis always spans it, so missing
  // data shows as empty space instead of the readings closing ranks.
  windowStart: string;
  windowEnd: string;
  windowLabel: string;
  // What one point is: a stored reading, or an hourly average.
  readings?: Noun;
  // For a series with one slot per interval, what a slot is called, so
  // empty slots can be counted in the summary.
  slots?: Noun;
  // Readings further apart than this are not joined by the line.
  maxGapMinutes?: number;
  curve?: "monotone" | "stepAfter";
  yDomain?: [number, number];
  yTicks?: number[];
  thresholds?: ChartThreshold[];
};

type MeasuredPoint = {
  observed_at: string;
  value: number;
};

const CHART_HEIGHT = 260;

const READINGS: Noun = {
  one: "reading",
  many: "readings",
};

const AXIS_TICK = {
  fill: "var(--color-text-muted)",
  fontSize: 12,
};

function plural(
  count: number,
  noun: Noun
): string {
  return `${count} ${count === 1 ? noun.one : noun.many}`;
}

// buildChartData adds one empty point per gap, so the difference in
// length is the number of breaks in the line.
function countGaps(
  data: ChartDatum[],
  points: ChartPoint[]
): number {
  return data.length - points.length;
}

function TrendLineChart({
  title,
  points,
  measurement,
  windowStart,
  windowEnd,
  windowLabel,
  readings = READINGS,
  slots,
  maxGapMinutes,
  curve = "monotone",
  yDomain,
  yTicks,
  thresholds = [],
}: TrendLineChartProps) {
  const { unit } = MEASUREMENTS[measurement];

  const startMs = Date.parse(windowStart);
  const endMs = Date.parse(windowEnd);

  const data = buildChartData(
    points,
    maxGapMinutes
  );

  const measured = points.filter(
    (point): point is MeasuredPoint =>
      point.value !== null
  );

  const emptyCount =
    points.length - measured.length;

  const gapCount = countGaps(data, points);

  const latest = measured[measured.length - 1];

  // -----------------------------------------------------------
  // The text that stands in for the chart
  // -----------------------------------------------------------

  const windowText =
    `${windowLabel}, ${formatUtc(windowStart)} `
    + `to ${formatUtc(windowEnd)}.`;

  let summary =
    `${windowText} No ${readings.many} were stored `
    + "in this window.";

  if (latest) {
    const values = measured.map(
      (point) => point.value
    );

    const emptyNote = slots && emptyCount > 0
      ? ` ${plural(emptyCount, slots)} `
        + `${emptyCount === 1 ? "has" : "have"} no stored reading.`
      : "";

    const gapNote = gapCount > 0
      ? ` The line breaks at ${plural(gapCount, {
        one: "gap",
        many: "gaps",
      })} with no stored reading.`
      : "";

    summary = (
      `${windowText} Latest `
      + `${formatMeasurementWithUnit(measurement, latest.value)} at `
      + `${formatUtc(latest.observed_at)}. `
      + "Ranged from "
      + `${formatMeasurementValue(measurement, Math.min(...values))} `
      + "to "
      + `${formatMeasurementWithUnit(measurement, Math.max(...values))} `
      + `across ${plural(measured.length, readings)}.`
      + emptyNote
      + gapNote
    );
  }

  // The chart is one image to assistive technology, described by the
  // summary. Recharts' own keyboard layer is turned off because it
  // would add a focusable element inside that image. The data table
  // below is the keyboard and screen reader route to every value.
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
            data={data}
            accessibilityLayer={false}
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
              dataKey="t"
              type="number"
              scale="time"
              domain={[startMs, endMs]}
              ticks={dayTicksBetween(startMs, endMs)}
              tickFormatter={(value: number) =>
                formatUtcDay(new Date(value).toISOString())
              }
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
                formatUtc(
                  new Date(Number(label)).toISOString()
                )
              }
              formatter={(value) => [
                formatMeasurementWithUnit(
                  measurement,
                  Number(value)
                ),
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

      <figcaption className="ui-caption">
        {summary}
      </figcaption>

      <details className="trend-data">
        <summary>Show data table</summary>

        <div
          className="trend-data-scroll"
          tabIndex={0}
          role="region"
          aria-label={`${title} data table`}
        >
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
                    {formatMeasurementValue(
                      measurement,
                      point.value
                    )}
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
