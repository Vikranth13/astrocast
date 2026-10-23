// Mirrors backend/schemas/space_weather.py. Every type keeps the name of
// the Pydantic model it copies, so one search finds both sides of the
// contract. Python datetime fields arrive as ISO 8601 strings with an
// offset, for example "2026-09-06T21:00:00Z".

export type FreshnessStatus =
  | "current"
  | "delayed"
  | "stale";

export type ActivityLevel =
  | "below_storm"
  | "minor"
  | "moderate"
  | "strong"
  | "severe"
  | "extreme";

export type NoaaGeomagneticScale =
  | "G1"
  | "G2"
  | "G3"
  | "G4"
  | "G5";

export type RiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "severe";

// The alert enumerations are also filter options, so they are arrays
// first and types second.
export const ALERT_TYPES = [
  "alert",
  "warning",
  "watch",
  "summary",
  "cancellation",
  "other",
] as const;

export type AlertType =
  (typeof ALERT_TYPES)[number];

export const ALERT_STATUSES = [
  "active",
  "expired",
  "unknown",
] as const;

export type AlertStatus =
  (typeof ALERT_STATUSES)[number];

export const ALERT_SEVERITIES = [
  "G1", "G2", "G3", "G4", "G5",
  "R1", "R2", "R3", "R4", "R5",
  "S1", "S2", "S3", "S4", "S5",
] as const;

export type AlertSeverity =
  (typeof ALERT_SEVERITIES)[number];

export type SpaceWeatherFreshness = {
  status: FreshnessStatus;
  age_minutes: number;
};

export type SpaceWeatherExplanation = {
  summary: string;
  details: string[];
  caveats: string[];
};

export type GeomagneticActivity = {
  level: ActivityLevel;
  label: string;
  noaa_scale: NoaaGeomagneticScale | null;
  is_storm: boolean;
};

export type PlanetaryKpFacts = {
  kp: number;
  a_running: number | null;
  station_count: number | null;
};

// GET /api/space-weather/current
export type CurrentSpaceWeatherResponse = {
  source: string;
  metric_name: string;
  observed_at: string;
  ingested_at: string;
  freshness: SpaceWeatherFreshness;
  geomagnetic_activity: GeomagneticActivity;
  facts: PlanetaryKpFacts;
  explanation: string;
  explanation_detail: SpaceWeatherExplanation;
};

export type SpaceWeatherAlertResponse = {
  id: number;
  source: string;
  external_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity | null;
  issued_at: string;
  expires_at: string | null;
  status: AlertStatus;
  summary: string;
  ingested_at: string;
};

// GET /api/space-weather/alerts. count is the alerts on this page, total
// is every alert matching the filters, and offset is how many matching
// alerts come before this page.
export type SpaceWeatherAlertListResponse = {
  count: number;
  total: number;
  offset: number;
  alerts: SpaceWeatherAlertResponse[];
};

// GET /api/space-weather/alerts/{alert_id}
export type SpaceWeatherAlertDetailResponse =
  SpaceWeatherAlertResponse & {
    explanation: SpaceWeatherExplanation;
  };

export type TrendInterval =
  | "reading"
  | "hour";

// A reference value from the risk rules, served with each trend so the
// chart draws the line the risk engine applies.
export type TrendThreshold = {
  rule_id: string;
  factor: string;
  value: number;
  unit: string;
  label: string;
};

export type SpaceWeatherTrendPoint = {
  observed_at: string;
  value: number;
};

// GET /api/space-weather/trends/kp
export type SpaceWeatherTrendResponse = {
  source: string;
  metric_name: string;
  unit: string | null;
  count: number;
  points: SpaceWeatherTrendPoint[];
  thresholds: TrendThreshold[];
};

export type SolarWindTrendPoint = {
  observed_at: string;
  station: string | null;
  speed_km_s: number | null;
  density_per_cm3: number | null;
  temperature_k: number | null;
};

// GET /api/space-weather/trends/solar-wind. With interval "hour", every
// hour of the window is present and an hour with no stored reading has
// null values.
export type SolarWindTrendResponse = {
  source: string;
  interval: TrendInterval;
  count: number;
  points: SolarWindTrendPoint[];
  thresholds: TrendThreshold[];
};

export type SpaceWeatherRiskFactor = {
  rule_id: string;
  factor: string;
  value: number;
  unit: string;
  description: string;
};

export type SpaceWeatherRiskAssessment = {
  level: RiskLevel;
  contributing_factors: SpaceWeatherRiskFactor[];
  rule_ids: string[];
};

export type SpaceWeatherRiskRawValues = {
  kp: number;
  kp_observed_at: string;
  solar_wind_speed_km_s: number | null;
  solar_wind_speed_observed_at: string | null;
  solar_wind_density_per_cm3: number | null;
  solar_wind_density_observed_at: string | null;
  solar_wind_station: string | null;
};

// GET /api/space-weather/risk
export type CurrentSpaceWeatherRiskResponse = {
  source: string;
  assessed_at: string;
  raw_values: SpaceWeatherRiskRawValues;
  risk: SpaceWeatherRiskAssessment;
  explanation: SpaceWeatherExplanation;
};
