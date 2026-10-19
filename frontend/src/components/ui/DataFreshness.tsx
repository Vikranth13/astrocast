import SeverityBadge from "./SeverityBadge";

import {
  toneForFreshness,
} from "./severity";

import type {
  FreshnessStatus,
} from "../../api/types/spaceWeather";

import "./ui.css";

type DataFreshnessProps = {
  status: FreshnessStatus;
  ageMinutes: number;
};

function formatAge(
  ageMinutes: number
): string {
  if (ageMinutes < 60) {
    return `${ageMinutes} minutes`;
  }

  const hours = Math.floor(
    ageMinutes / 60
  );

  const minutes = ageMinutes % 60;

  if (minutes === 0) {
    return `${hours} hours`;
  }

  return `${hours}h ${minutes}m`;
}

function DataFreshness({
  status,
  ageMinutes,
}: DataFreshnessProps) {
  return (
    <span className="ui-freshness">
      <SeverityBadge
        label={status}
        tone={toneForFreshness(status)}
      />

      <span className="ui-footnote">
        {formatAge(ageMinutes)} old
      </span>
    </span>
  );
}

export default DataFreshness;
