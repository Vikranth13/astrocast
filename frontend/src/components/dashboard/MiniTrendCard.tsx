import {
  Line,
  LineChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";

import Card from "../ui/Card";

import type {
  MiniTrend,
} from "../../data/mockDashboard";

import "./dashboard.css";

type MiniTrendCardProps = {
  trend: MiniTrend;
};

const CHART_HEIGHT = 72;

function formatChange(
  change: number
): string {
  const direction =
    change >= 0 ? "up" : "down";

  return `${direction} ${Math.abs(
    change
  )} over 24 hours`;
}

function MiniTrendCard({
  trend,
}: MiniTrendCardProps) {
  return (
    <Card>
      <div className="dashboard-card-body">
        <span className="dashboard-card-title">
          {trend.metric}
        </span>

        <div className="mini-trend-value">
          <span className="mini-trend-number">
            {trend.current}
          </span>

          <span className="mini-trend-unit">
            {trend.unit}
          </span>
        </div>

        <span className="mini-trend-change">
          {formatChange(trend.change)}
        </span>

        <div className="mini-trend-chart">
          <ResponsiveContainer
            width="100%"
            height={CHART_HEIGHT}
          >
            <LineChart
              data={trend.points}
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
