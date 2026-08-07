export type AstroCastForecast = {
  location: {
    name: string;
    region: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
    timezone: string | null;
  };
  forecast_time: string;
  conditions: {
    cloud_cover_percent: number | null;
    precipitation_probability_percent: number | null;
    temperature_f: number | null;
    wind_speed_mph: number | null;
    visibility_miles: number | null;
  };
  stargazing: {
    score: number;
    rating: string;
    explanation: string;
  };
};

export type CurrentSpaceWeather = {
  source: string;
  metric_name: string;
  observed_at: string;
  ingested_at: string;
  freshness: {
    status: "current" | "delayed" | "stale";
    age_minutes: number;
  };
  geomagnetic_activity: {
    level:
      | "below_storm"
      | "minor"
      | "moderate"
      | "strong"
      | "severe"
      | "extreme";
    label: string;
    noaa_scale:
      | "G1"
      | "G2"
      | "G3"
      | "G4"
      | "G5"
      | null;
    is_storm: boolean;
  };
  facts: {
    kp: number;
    a_running: number | null;
    station_count: number | null;
  };
  explanation: string;
};

const API_BASE_URL = "http://localhost:8000";

async function parseApiError(
  response: Response,
  fallbackMessage: string
): Promise<Error> {
  try {
    const errorData = await response.json();

    return new Error(
      errorData.detail || fallbackMessage
    );
  } catch {
    return new Error(fallbackMessage);
  }
}

export async function getForecast(
  city: string
): Promise<AstroCastForecast> {
  const response = await fetch(
    `${API_BASE_URL}/forecast?city=${encodeURIComponent(city)}`
  );

  if (!response.ok) {
    throw await parseApiError(
      response,
      "Failed to fetch forecast."
    );
  }

  return response.json();
}

export async function getCurrentSpaceWeather():
  Promise<CurrentSpaceWeather> {
  const response = await fetch(
    `${API_BASE_URL}/api/space-weather/current`
  );

  if (!response.ok) {
    throw await parseApiError(
      response,
      "Failed to fetch current space weather."
    );
  }

  return response.json();
}