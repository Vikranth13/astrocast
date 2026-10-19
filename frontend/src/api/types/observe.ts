// Mirrors the dictionary built by get_forecast_for_city in
// backend/services/weather_service.py. The /forecast route has no Pydantic
// response model yet, so the service code is the contract.

export type ForecastLocation = {
  name: string;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
};

export type ForecastConditions = {
  cloud_cover_percent: number | null;
  precipitation_probability_percent: number | null;
  temperature_f: number | null;
  wind_speed_mph: number | null;
  visibility_miles: number | null;
};

export type StargazingScore = {
  score: number;
  rating: string;
  explanation: string;
};

// GET /forecast
export type ForecastResponse = {
  location: ForecastLocation;
  // Open-Meteo local time for the location, with no offset, for example
  // "2026-10-19T22:00". Do not parse it as UTC.
  forecast_time: string;
  conditions: ForecastConditions;
  stargazing: StargazingScore;
};
