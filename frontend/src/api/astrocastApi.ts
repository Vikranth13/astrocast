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

const API_BASE_URL = "http://localhost:8000";

export async function getForecast(city: string): Promise<AstroCastForecast> {
  const response = await fetch(
    `${API_BASE_URL}/forecast?city=${encodeURIComponent(city)}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to fetch forecast");
  }

  return response.json();
}