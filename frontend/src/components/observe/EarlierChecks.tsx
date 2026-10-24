import type {
  ForecastSnapshotSummary,
} from "../../api/types/observe";

import {
  formatLocalTime,
  formatUtc,
} from "../../utils/format";

import {
  describeChange,
} from "./forecastHistory";

import "./observe.css";

type EarlierChecksProps = {
  snapshots: ForecastSnapshotSummary[];
};

// Newest first. Every entry names the night it forecast, and a change is
// only reported between checks of the same forecast hour.
function EarlierChecks({
  snapshots,
}: EarlierChecksProps) {
  return (
    <ol
      className="earlier-checks"
      aria-label="Earlier checks"
    >
      {snapshots.map((snapshot, index) => {
        const change = describeChange(
          snapshots,
          index
        );

        return (
          <li
            className="earlier-check"
            key={`${snapshot.retrieved_at}-${snapshot.forecast_time}`}
          >
            <span className="earlier-check-score">
              {snapshot.score} {snapshot.rating}
            </span>

            <span className="ui-caption">
              Checked {formatUtc(snapshot.retrieved_at)} for{" "}
              {formatLocalTime(snapshot.forecast_time)}
              {index === 0 ? " (latest)" : ""}
            </span>

            {change && (
              <span className="ui-caption earlier-check-change">
                {change}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default EarlierChecks;
