import type {
  CurrentSpaceWeather,
} from "../api/astrocastApi";

import Card from "./ui/Card";
import DataFreshness from "./ui/DataFreshness";
import EmptyState from "./ui/EmptyState";
import ErrorState from "./ui/ErrorState";
import LoadingState from "./ui/LoadingState";

import "./SpaceWeatherCard.css";

type SpaceWeatherCardProps = {
  data: CurrentSpaceWeather | null;
  isLoading: boolean;
  errorMessage: string;
};

function formatTimestamp(
  timestamp: string
): string {
  return new Date(
    timestamp
  ).toLocaleString();
}

function SpaceWeatherCard({
  data,
  isLoading,
  errorMessage,
}: SpaceWeatherCardProps) {
  if (isLoading) {
    return (
      <Card className="space-weather-card">
        <h2>Space Weather</h2>

        <LoadingState
          message="Loading NOAA geomagnetic data..."
        />
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className="space-weather-card">
        <h2>Space Weather</h2>

        <ErrorState
          message={errorMessage}
        />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="space-weather-card">
        <h2>Space Weather</h2>

        <EmptyState
          message="No stored NOAA data is available."
        />
      </Card>
    );
  }

  return (
    <Card className="space-weather-card">
      <div className="space-weather-header">
        <h2>Space Weather</h2>

        <DataFreshness
          status={data.freshness.status}
          ageMinutes={
            data.freshness.age_minutes
          }
        />
      </div>

      <p className="space-weather-kp">
        Kp {data.facts.kp.toFixed(2)}
      </p>

      <p className="space-weather-label">
        {data.geomagnetic_activity.label}
      </p>

      <div className="space-weather-details">
        <p>
          <strong>NOAA scale:</strong>{" "}
          {data.geomagnetic_activity
            .noaa_scale ?? "Below G1"}
        </p>

        <p>
          <strong>Observed:</strong>{" "}
          {formatTimestamp(
            data.observed_at
          )}
        </p>

        {data.facts.station_count !== null && (
          <p>
            <strong>Stations:</strong>{" "}
            {data.facts.station_count}
          </p>
        )}

        {data.facts.a_running !== null && (
          <p>
            <strong>Running a-index:</strong>{" "}
            {data.facts.a_running}
          </p>
        )}
      </div>

      <p>{data.explanation}</p>

      <p className="space-weather-note">
        This describes global geomagnetic
        activity, not a local aurora forecast.
      </p>
    </Card>
  );
}

export default SpaceWeatherCard;
