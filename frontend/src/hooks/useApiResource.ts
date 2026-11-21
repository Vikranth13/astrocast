import {
  useEffect,
  useState,
} from "react";

import {
  ApiRequestError,
  isCancelled,
  isRetryable,
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
    // Present only when asking again could help. Calling it loads the
    // same request again.
    retry?: () => void;
  }
  | {
    status: "ready";
    data: T;
  };

// A loader receives the signal for its own request. Passing it on to the
// API client lets the hook cancel the request when nobody needs it any
// more.
export type ApiLoader<T> = (
  options: {
    signal: AbortSignal;
  }
) => Promise<T>;

type SettledOutcome<T> =
  | {
    status: "ready";
    data: T;
  }
  | {
    status: "error";
    message: string;
    code?: string;
    retryable: boolean;
  };

type SettledResource<T> = {
  load: ApiLoader<T>;
  attempt: number;
  outcome: SettledOutcome<T>;
};

const FALLBACK_ERROR_MESSAGE = "Something went wrong.";

// The last successful response for each cache key, kept in memory for as
// long as the page is open. A reload starts empty.
const responseCache = new Map<string, unknown>();

// Tests call this between cases so one test never sees another's data.
export function clearApiResourceCache(): void {
  responseCache.clear();
}

// Drops one cached response after the data behind it has been deleted,
// so the next load shows its loading state rather than the old data.
export function forgetCachedResource(
  cacheKey: string
): void {
  responseCache.delete(cacheKey);
}

// Reshapes ready data and passes every other state through, so a card
// can render a summary of a response without losing its loading and
// error states, or its retry.
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
// Each request gets its own AbortController. When the loader changes, a
// retry starts, or the component goes away, the request still running is
// cancelled rather than left to finish for nobody.
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

  // Counts retries. Changing it runs the effect again with the same
  // loader.
  const [attempt, setAttempt] =
    useState(0);

  useEffect(() => {
    if (load === null) {
      return;
    }

    const controller = new AbortController();

    load({
      signal: controller.signal,
    }).then(
      (data) => {
        if (controller.signal.aborted) {
          return;
        }

        if (cacheKey !== undefined) {
          responseCache.set(
            cacheKey,
            data
          );
        }

        setSettled({
          load,
          attempt,
          outcome: {
            status: "ready",
            data,
          },
        });
      },
      (error: unknown) => {
        // A cancelled request has nobody waiting for it.
        if (
          controller.signal.aborted
          || isCancelled(error)
        ) {
          return;
        }

        setSettled({
          load,
          attempt,
          outcome: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : FALLBACK_ERROR_MESSAGE,
            ...(error instanceof ApiRequestError
              ? { code: error.code }
              : {}),
            retryable: isRetryable(error),
          },
        });
      }
    );

    return () => {
      controller.abort();
    };
  }, [load, cacheKey, attempt]);

  if (load === null) {
    return {
      status: "idle",
    };
  }

  if (
    settled !== null
    && settled.load === load
    && settled.attempt === attempt
  ) {
    const { outcome } = settled;

    if (outcome.status === "ready") {
      return outcome;
    }

    return {
      status: "error",
      message: outcome.message,
      ...(outcome.code !== undefined
        ? { code: outcome.code }
        : {}),
      ...(outcome.retryable
        ? { retry: () => setAttempt((count) => count + 1) }
        : {}),
    };
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
