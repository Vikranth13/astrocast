import {
  useEffect,
  useState,
} from "react";

import {
  ApiRequestError,
} from "../api/client";

export type ApiResource<T> =
  | {
    status: "idle";
  }
  | {
    status: "loading";
  }
  | {
    status: "error";
    message: string;
    // The backend's error code, such as not_found, when the failure came
    // from the API client. Lets a page tell a missing record from an
    // unreachable server.
    code?: string;
  }
  | {
    status: "ready";
    data: T;
  };

export type ApiLoader<T> = () => Promise<T>;

type SettledResource<T> = {
  load: ApiLoader<T>;
  outcome: Extract<
    ApiResource<T>,
    { status: "error" | "ready" }
  >;
};

const FALLBACK_ERROR_MESSAGE = "Something went wrong.";

// The last successful response for each cache key, kept in memory for as
// long as the page is open. A reload starts empty.
const responseCache = new Map<string, unknown>();

// Tests call this between cases so one test never sees another's data.
export function clearApiResourceCache(): void {
  responseCache.clear();
}

// Reshapes ready data and passes every other state through, so a card
// can render a summary of a response without losing its loading and
// error states.
export function mapResource<T, U>(
  resource: ApiResource<T>,
  transform: (data: T) => U
): ApiResource<U> {
  if (resource.status !== "ready") {
    return resource;
  }

  return {
    status: "ready",
    data: transform(resource.data),
  };
}

// Tracks one data source on its own, so a failed request only ever
// affects the card that asked for it. Pass null to stay idle, for example
// until a city has been chosen. The loader must keep the same identity
// between renders (a module-level function, or one from useMemo) or it
// will be called again on every render.
//
// With a cache key, a page that is left and opened again shows the last
// response at once while a fresh request runs, then shows the fresh one.
// If that request fails, the error replaces the cached data rather than
// letting an old response pass for a current one. A key must always
// stand for the same request.
export function useApiResource<T>(
  load: ApiLoader<T> | null,
  cacheKey?: string
): ApiResource<T> {
  const [settled, setSettled] =
    useState<SettledResource<T> | null>(
      null
    );

  useEffect(() => {
    if (load === null) {
      return;
    }

    // A result that arrives after the loader has changed, or after the
    // component has gone, belongs to a request nobody is waiting for.
    let ignoreResult = false;

    load().then(
      (data) => {
        if (cacheKey !== undefined) {
          responseCache.set(
            cacheKey,
            data
          );
        }

        if (!ignoreResult) {
          setSettled({
            load,
            outcome: {
              status: "ready",
              data,
            },
          });
        }
      },
      (error: unknown) => {
        if (!ignoreResult) {
          setSettled({
            load,
            outcome: {
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : FALLBACK_ERROR_MESSAGE,
              ...(error instanceof ApiRequestError
                ? { code: error.code }
                : {}),
            },
          });
        }
      }
    );

    return () => {
      ignoreResult = true;
    };
  }, [load, cacheKey]);

  if (load === null) {
    return {
      status: "idle",
    };
  }

  if (settled !== null && settled.load === load) {
    return settled.outcome;
  }

  // Loading is derived rather than stored: until this loader settles,
  // whatever is in state belongs to an earlier one. A cached response
  // for the same key fills the gap.
  if (
    cacheKey !== undefined
    && responseCache.has(cacheKey)
  ) {
    return {
      status: "ready",
      data: responseCache.get(cacheKey) as T,
    };
  }

  return {
    status: "loading",
  };
}
