import {
  apiGet,
} from "./client";

import type {
  ForecastResponse,
} from "./types/observe";

export function getForecast(
  city: string
): Promise<ForecastResponse> {
  return apiGet<ForecastResponse>(
    "/forecast",
    {
      params: {
        city,
      },
      fallbackMessage: "Failed to fetch forecast.",
    }
  );
}
