import type {
  CurrentSpaceWeather,
} from "../api/astrocastApi";

import DataFreshness from "./ui/DataFreshness";

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
      <div className="card space-weather-card">
        <h2>Space Weather</h2>

        <p>
          Loading NOAA geomagnetic data...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="card space-weather-card">
        <h2>Space Weather</h2>

        <p className="error-message">
          {errorMessage}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card space-weather-card">
        <h2>Space Weather</h2>

        <p>
          No stored NOAA data is available.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-weather-card">
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
    </div>
  );
}

export default SpaceWeatherCard;
