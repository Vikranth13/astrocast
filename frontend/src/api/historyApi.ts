import {
  apiDelete,
  apiGet,
  type RequestOptions,
} from "./client";

import type {
  ClearHistoryResponse,
  ForecastHistoryResponse,
  RecentSearchListResponse,
} from "./types/observe";

// The search history has no accounts behind it: it is shared by everyone
// using the backend.

export function listRecentSearches(
  limit = 5,
  options: RequestOptions = {}
): Promise<RecentSearchListResponse> {
  return apiGet<RecentSearchListResponse>(
    "/api/locations/recent",
    {
      ...options,
      params: {
        limit,
      },
      fallbackMessage: "Failed to fetch recent searches.",
    }
  );
}

export function getForecastHistory(
  locationId: number,
  limit = 10,
  options: RequestOptions = {}
): Promise<ForecastHistoryResponse> {
  return apiGet<ForecastHistoryResponse>(
    `/api/locations/${locationId}/forecasts`,
    {
      ...options,
      params: {
        limit,
      },
      fallbackMessage: "Failed to fetch earlier checks.",
    }
  );
}

// Deletes every searched place and saved check, for everyone using the
// backend. It cannot be undone, so callers confirm with the user first.
export function clearSearchHistory(): Promise<ClearHistoryResponse> {
  return apiDelete<ClearHistoryResponse>(
    "/api/locations",
    {
      fallbackMessage: "Failed to clear the search history.",
    }
  );
}
