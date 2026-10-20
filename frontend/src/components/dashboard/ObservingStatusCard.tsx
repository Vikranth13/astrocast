import ScoreReadout from "../observe/ScoreReadout";

import Card from "../ui/Card";
import Meter from "../ui/Meter";

import type {
  ForecastResponse,
} from "../../api/types/observe";

import {
  formatLocalHour,
} from "../../utils/format";

type ObservingStatusCardProps = {
  forecast: ForecastResponse;
};

function ObservingStatusCard({
  forecast,
}: ObservingStatusCardProps) {
  const {
    location,
    stargazing,
  } = forecast;

  return (
    <Card className="ui-span-2">
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Observing status
        </span>

        <ScoreReadout
          score={stargazing.score}
          rating={stargazing.rating}
        />

        <Meter percent={stargazing.score} />

        <p className="ui-muted">
          {stargazing.explanation}
        </p>

        <p className="ui-muted">
          {stargazing.limiting_factor
            ? `Limiting factor: ${stargazing.limiting_factor}`
            : "No condition is holding the score back."}
        </p>

        <p className="ui-caption">
          {location.name}
          {location.region
            ? `, ${location.region}`
            : ""}
          {" "}at{" "}
          {formatLocalHour(
            forecast.forecast_time
          )}{" "}
          local time
        </p>
      </div>
    </Card>
  );
}

export default ObservingStatusCard;
