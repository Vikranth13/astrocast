import {
  apiGet,
} from "./client";

import type {
  ForecastHistoryResponse,
  RecentSearchListResponse,
} from "./types/observe";

// The search history has no accounts behind it: it is shared by everyone
// using the backend.

export function listRecentSearches(
  limit = 5
): Promise<RecentSearchListResponse> {
  return apiGet<RecentSearchListResponse>(
    "/api/locations/recent",
    {
      params: {
        limit,
      },
      fallbackMessage: "Failed to fetch recent searches.",
    }
  );
}

export function getForecastHistory(
  locationId: number,
  limit = 10
): Promise<ForecastHistoryResponse> {
  return apiGet<ForecastHistoryResponse>(
    `/api/locations/${locationId}/forecasts`,
    {
      params: {
        limit,
      },
      fallbackMessage: "Failed to fetch earlier checks.",
    }
  );
}
