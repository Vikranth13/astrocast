import {
  apiGet,
  type RequestOptions,
} from "./client";

import type {
  ForecastResponse,
} from "./types/observe";

export function getForecast(
  city: string,
  options: RequestOptions = {}
): Promise<ForecastResponse> {
  return apiGet<ForecastResponse>(
    "/forecast",
    {
      ...options,
      params: {
        city,
      },
      fallbackMessage: "Failed to fetch forecast.",
    }
  );
}
