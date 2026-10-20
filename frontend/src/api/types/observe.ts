// Mirrors backend/schemas/observe.py. Every time here is Open-Meteo local
// time for the location, with no UTC offset, for example
// "2026-10-19T22:00". Do not parse these as UTC.

export type StargazingRating =
  | "Excellent"
  | "Good"
  | "Okay"
  | "Poor"
  | "Bad";

export type ScoreFactorName =
  | "cloud_cover"
  | "precipitation_probability"
  | "wind_speed"
  | "visibility";

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

export type ScoreFactor = {
  factor: ScoreFactorName;
  label: string;
  value: number;
  unit: string;
  penalty: number;
  is_limiting: boolean;
  note: string;
};

export type StargazingScore = {
  score: number;
  rating: StargazingRating;
  explanation: string;
  limiting_factor: string | null;
  factors: ScoreFactor[];
};

export type HourlyForecast =
  ForecastConditions & {
    time: string;
    score: number;
    rating: StargazingRating;
  };

// The longest run of hours rated Good or better. When no hour reaches
// Good, this is the single best hour and qualifies is false.
export type BestObservingWindow = {
  first_hour: string;
  last_hour: string;
  hour_count: number;
  peak_time: string;
  peak_score: number;
  peak_rating: StargazingRating;
  qualifies: boolean;
};

// GET /forecast
export type ForecastResponse = {
  location: ForecastLocation;
  forecast_time: string;
  conditions: ForecastConditions;
  stargazing: StargazingScore;
  hourly: HourlyForecast[];
  best_window: BestObservingWindow | null;
};
