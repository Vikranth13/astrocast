import {
  Line,
  LineChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";

import Card from "../ui/Card";

import type {
  MiniTrend,
} from "./trendSummary";

import {
  formatUtc,
} from "../../utils/format";

import "./dashboard.css";

type MiniTrendCardProps = {
  trend: MiniTrend;
};

const CHART_HEIGHT = 72;

function formatChange(
  change: number,
  decimals: number
): string {
  if (change === 0) {
    return "unchanged across the last 24 hours";
  }

  const direction =
    change > 0 ? "up" : "down";

  return `${direction} ${Math.abs(change).toFixed(
    decimals
  )} across the last 24 hours`;
}

function MiniTrendCard({
  trend,
}: MiniTrendCardProps) {
  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          {trend.metric}
        </span>

        <div className="mini-trend-value">
          <span className="ui-headline">
            {trend.current.toFixed(trend.decimals)}
          </span>

          {trend.unit && (
            <span className="ui-caption">
              {trend.unit}
            </span>
          )}
        </div>

        <span className="ui-caption">
          {formatChange(
            trend.change,
            trend.decimals
          )}
        </span>

        <span className="ui-caption">
          Latest reading{" "}
          {formatUtc(trend.latestObservedAt)}
        </span>

        <div
          className="mini-trend-chart"
          aria-hidden="true"
        >
          <ResponsiveContainer
            width="100%"
            height={CHART_HEIGHT}
          >
            <LineChart
              data={trend.points}
              accessibilityLayer={false}
              margin={{
                top: 4,
                right: 4,
                bottom: 4,
                left: 4,
              }}
            >
              <YAxis
                hide
                domain={[
                  "dataMin",
                  "dataMax",
                ]}
              />

              <Line
                type="monotone"
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
      </div>
    </Card>
  );
}

export default MiniTrendCard;
