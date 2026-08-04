import type {
  CurrentSpaceWeather,
} from "../api/astrocastApi";

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

        <span className="space-weather-badge">
          {data.freshness.status}
        </span>
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

        <p>
          <strong>Data age:</strong>{" "}
          {formatAge(
            data.freshness.age_minutes
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