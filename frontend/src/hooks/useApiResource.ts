import {
  useEffect,
  useState,
} from "react";

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
export function useApiResource<T>(
  load: ApiLoader<T> | null
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
            },
          });
        }
      }
    );

    return () => {
      ignoreResult = true;
    };
  }, [load]);

  if (load === null) {
    return {
      status: "idle",
    };
  }

  // Loading is derived rather than stored: until this loader settles,
  // whatever is in state belongs to an earlier one.
  if (settled === null || settled.load !== load) {
    return {
      status: "loading",
    };
  }

  return settled.outcome;
}
