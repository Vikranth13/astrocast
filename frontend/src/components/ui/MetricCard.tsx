import Card from "./Card";

import "./ui.css";

type MetricCardProps = {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  footnote?: string;
};

const MISSING_VALUE = "—";

function MetricCard({
  label,
  value,
  unit,
  footnote,
}: MetricCardProps) {
  const hasValue =
    value !== null && value !== undefined;

  return (
    <Card className="ui-metric-card">
      <span className="ui-metric-label">
        {label}
      </span>

      <span className="ui-metric-value">
        <span className="ui-metric-number">
          {hasValue ? value : MISSING_VALUE}
        </span>

        {hasValue && unit && (
          <span className="ui-metric-unit">
            {unit}
          </span>
        )}
      </span>

      {footnote && (
        <span className="ui-metric-footnote">
          {footnote}
        </span>
      )}
    </Card>
  );
}

export default MetricCard;
