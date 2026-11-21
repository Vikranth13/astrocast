import {
  apiGet,
  type RequestOptions,
} from "./client";

import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CurrentSpaceWeatherResponse,
  CurrentSpaceWeatherRiskResponse,
  SolarWindTrendResponse,
  SpaceWeatherAlertDetailResponse,
  SpaceWeatherAlertListResponse,
  SpaceWeatherTrendResponse,
  TrendInterval,
} from "./types/spaceWeather";

const SPACE_WEATHER_PATH = "/api/space-weather";

// Keys are the backend's own query parameter names, so the Alerts page
// can forward its URL filters unchanged. The field on each alert is
// alert_type, but the parameter is type. A null or missing key means no
// filter.
export type AlertQuery = {
  severity?: AlertSeverity | null;
  type?: AlertType | null;
  status?: AlertStatus | null;
  source?: "NOAA_SWPC" | null;
  issued_start?: string | null;
  issued_end?: string | null;
  limit?: number;
  offset?: number;
};

// start and end are ISO 8601 timestamps.
export type TrendQuery = {
  start?: string;
  end?: string;
  limit?: number;
};

// The solar-wind trend can also be averaged per hour. start is required
// then, and limit caps the number of hours.
export type SolarWindTrendQuery = TrendQuery & {
  interval?: TrendInterval;
};

export function getCurrentSpaceWeather(
  options: RequestOptions = {}
): Promise<CurrentSpaceWeatherResponse> {
  return apiGet<CurrentSpaceWeatherResponse>(
    `${SPACE_WEATHER_PATH}/current`,
    {
      ...options,
      fallbackMessage:
        "Failed to fetch current space weather.",
    }
  );
}

export function getCurrentSpaceWeatherRisk(
  options: RequestOptions = {}
): Promise<CurrentSpaceWeatherRiskResponse> {
  return apiGet<CurrentSpaceWeatherRiskResponse>(
    `${SPACE_WEATHER_PATH}/risk`,
    {
      ...options,
      fallbackMessage:
        "Failed to fetch the space-weather risk assessment.",
    }
  );
}

export function listSpaceWeatherAlerts(
  query: AlertQuery = {},
  options: RequestOptions = {}
): Promise<SpaceWeatherAlertListResponse> {
  return apiGet<SpaceWeatherAlertListResponse>(
    `${SPACE_WEATHER_PATH}/alerts`,
    {
      ...options,
      params: query,
      fallbackMessage:
        "Failed to fetch space-weather alerts.",
    }
  );
}

export function getSpaceWeatherAlert(
  alertId: number,
  options: RequestOptions = {}
): Promise<SpaceWeatherAlertDetailResponse> {
  return apiGet<SpaceWeatherAlertDetailResponse>(
    `${SPACE_WEATHER_PATH}/alerts/${alertId}`,
    {
      ...options,
      fallbackMessage:
        "Failed to fetch the space-weather alert.",
    }
  );
}

export function getKpTrend(
  query: TrendQuery = {},
  options: RequestOptions = {}
): Promise<SpaceWeatherTrendResponse> {
  return apiGet<SpaceWeatherTrendResponse>(
    `${SPACE_WEATHER_PATH}/trends/kp`,
    {
      ...options,
      params: query,
      fallbackMessage:
        "Failed to fetch the Kp trend.",
    }
  );
}

export function getSolarWindTrend(
  query: SolarWindTrendQuery = {},
  options: RequestOptions = {}
): Promise<SolarWindTrendResponse> {
  return apiGet<SolarWindTrendResponse>(
    `${SPACE_WEATHER_PATH}/trends/solar-wind`,
    {
      ...options,
      params: query,
      fallbackMessage:
        "Failed to fetch the solar-wind trend.",
    }
  );
}
