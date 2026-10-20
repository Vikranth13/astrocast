import Card from "../ui/Card";

import type {
  BestObservingWindow,
  HourlyForecast,
} from "../../api/types/observe";

import {
  formatLocalHour,
} from "../../utils/format";

type BestWindowCardProps = {
  bestWindow: BestObservingWindow;
  hourly: HourlyForecast[];
};

// The window itself is chosen by the backend. This card only describes
// it, including the night it was chosen from, so the range is never
// assumed here.
function BestWindowCard({
  bestWindow,
  hourly,
}: BestWindowCardProps) {
  const nightStart = hourly[0]?.time;
  const nightEnd = hourly[hourly.length - 1]?.time;

  const peak =
    `${formatLocalHour(bestWindow.peak_time)} `
    + `(${bestWindow.peak_score}, ${bestWindow.peak_rating})`;

  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Best window
        </span>

        {bestWindow.qualifies ? (
          <>
            <span className="ui-headline">
              {formatLocalHour(bestWindow.first_hour)}
              {" to "}
              {formatLocalHour(bestWindow.last_hour)}
            </span>

            <p className="ui-muted">
              {bestWindow.hour_count === 1
                ? "1 hour"
                : `${bestWindow.hour_count} hours`}
              {" "}rated Good or better, peaking at {peak}.
            </p>
          </>
        ) : (
          <>
            <span className="ui-headline">
              No good window
            </span>

            <p className="ui-muted">
              No hour tonight rates Good or better. The best
              hour is {peak}.
            </p>
          </>
        )}

        {nightStart && nightEnd && (
          <p className="ui-caption">
            From hourly readings between{" "}
            {formatLocalHour(nightStart)} and{" "}
            {formatLocalHour(nightEnd)} local time. Moon and
            darkness are not included until Week 6.
          </p>
        )}
      </div>
    </Card>
  );
}

export default BestWindowCard;
