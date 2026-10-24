import type {
  ForecastSnapshotSummary,
} from "../../api/types/observe";

// How a check's score compares with the previous check of the same
// forecast hour. Checks of a different night are skipped, because a
// different night is a different forecast, not a change in this one.
// snapshots are newest first, as the history endpoint returns them.
// Returns null when there is nothing earlier to compare with.
export function describeChange(
  snapshots: ForecastSnapshotSummary[],
  index: number
): string | null {
  const current = snapshots[index];

  if (!current) {
    return null;
  }

  const previous = snapshots
    .slice(index + 1)
    .find(
      (candidate) =>
        candidate.forecast_time === current.forecast_time
    );

  if (!previous) {
    return null;
  }

  const difference = current.score - previous.score;

  if (difference === 0) {
    return "unchanged since the previous check";
  }

  const sign = difference > 0 ? "+" : "−";

  return `${sign}${Math.abs(difference)} since the previous check`;
}
