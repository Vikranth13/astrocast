import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  mapResource,
  useApiResource,
  type ApiLoader,
} from "./useApiResource";

import {
  ApiRequestError,
} from "../api/client";


function deferred<T>() {
  let resolve: (value: T) => void = () => {};

  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });

  return {
    promise,
    resolve,
  };
}


describe(
  "useApiResource",
  () => {
    it(
      "stays idle without a loader",
      () => {
        const { result } = renderHook(
          () => useApiResource(null)
        );

        expect(result.current).toEqual({
          status: "idle",
        });
      }
    );


    it(
      "loads, then holds the data",
      async () => {
        const load = () => Promise.resolve(42);

        const { result } = renderHook(
          () => useApiResource(load)
        );

        expect(result.current.status).toBe("loading");

        await waitFor(() => {
          expect(result.current).toEqual({
            status: "ready",
            data: 42,
          });
        });
      }
    );


    it(
      "reports the error message",
      async () => {
        const load = () => Promise.reject(
          new Error("Upstream failed.")
        );

        const { result } = renderHook(
          () => useApiResource(load)
        );

        // An error from outside the API client has an unknown cause, so
        // trying again is offered.
        await waitFor(() => {
          expect(result.current).toEqual({
            status: "error",
            message: "Upstream failed.",
            retry: expect.any(Function),
          });
        });
      }
    );


    it(
      "passes on the backend's error code",
      async () => {
        const load = () => Promise.reject(
          new ApiRequestError({
            message: "Space-weather alert was not found.",
            status: 404,
            code: "not_found",
          })
        );

        const { result } = renderHook(
          () => useApiResource(load)
        );

        // A missing record stays missing, so there is no retry.
        await waitFor(() => {
          expect(result.current).toEqual({
            status: "error",
            message: "Space-weather alert was not found.",
            code: "not_found",
          });
        });
      }
    );


    it(
      "ignores a result from a loader that has been replaced",
      async () => {
        const first = deferred<string>();
        const second = deferred<string>();

        const loadFirst = () => first.promise;
        const loadSecond = () => second.promise;

        const { result, rerender } = renderHook(
          ({ load }: { load: ApiLoader<string> }) => useApiResource(load),
          {
            initialProps: {
              load: loadFirst,
            },
          }
        );

        rerender({
          load: loadSecond,
        });

        second.resolve("Paris");

        await waitFor(() => {
          expect(result.current).toEqual({
            status: "ready",
            data: "Paris",
          });
        });

        // The slower, superseded request finishes last and must not win.
        first.resolve("Lisbon");

        await first.promise;

        expect(result.current).toEqual({
          status: "ready",
          data: "Paris",
        });
      }
    );
  }
);


describe(
  "useApiResource with a cache key",
  () => {
    async function seedCache(
      cacheKey: string,
      value: string
    ) {
      const load = () => Promise.resolve(value);

      const { result, unmount } = renderHook(
        () => useApiResource(load, cacheKey)
      );

      await waitFor(() => {
        expect(result.current.status).toBe("ready");
      });

      unmount();
    }


    it(
      "shows the cached response at once, then the fresh one",
      async () => {
        await seedCache("forecast:Paris", "earlier");

        const fresh = deferred<string>();
        const load = () => fresh.promise;

        const { result } = renderHook(
          () => useApiResource(load, "forecast:Paris")
        );

        // No loading state on the way back to the page.
        expect(result.current).toEqual({
          status: "ready",
          data: "earlier",
        });

        fresh.resolve("later");

        await waitFor(() => {
          expect(result.current).toEqual({
            status: "ready",
            data: "later",
          });
        });
      }
    );


    it(
      "replaces the cached response with the error when the refresh fails",
      async () => {
        await seedCache("space-weather:current", "earlier");

        const load = () => Promise.reject(
          new Error("Server unreachable.")
        );

        const { result } = renderHook(
          () => useApiResource(load, "space-weather:current")
        );

        await waitFor(() => {
          expect(result.current).toEqual({
            status: "error",
            message: "Server unreachable.",
            retry: expect.any(Function),
          });
        });
      }
    );


    it(
      "caches nothing without a key",
      async () => {
        const loadOnce = () => Promise.resolve("earlier");

        const firstMount = renderHook(
          () => useApiResource(loadOnce)
        );

        await waitFor(() => {
          expect(firstMount.result.current.status).toBe("ready");
        });

        firstMount.unmount();

        const pending = () => new Promise<string>(() => {});

        const { result } = renderHook(
          () => useApiResource(pending)
        );

        expect(result.current).toEqual({
          status: "loading",
        });
      }
    );


    it(
      "keeps a different key separate",
      async () => {
        await seedCache("forecast:Paris", "Paris");

        const pending = () => new Promise<string>(() => {});

        const { result } = renderHook(
          () => useApiResource(pending, "forecast:Lisbon")
        );

        expect(result.current).toEqual({
          status: "loading",
        });
      }
    );
  }
);


describe(
  "useApiResource cancellation and retry",
  () => {
    // A loader that never answers and records the signal it was given.
    function recordingLoader(
      signals: AbortSignal[]
    ): ApiLoader<string> {
      return ({ signal }) => {
        signals.push(signal);

        return new Promise<string>(() => {});
      };
    }


    it(
      "cancels the running request when the loader changes",
      () => {
        const signals: AbortSignal[] = [];

        const loadFirst = recordingLoader(signals);
        const loadSecond = recordingLoader(signals);

        const { rerender } = renderHook(
          ({ load }: { load: ApiLoader<string> }) => useApiResource(load),
          {
            initialProps: {
              load: loadFirst,
            },
          }
        );

        rerender({
          load: loadSecond,
        });

        expect(signals).toHaveLength(2);
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
      }
    );


    it(
      "cancels the running request when the component goes away",
      () => {
        const signals: AbortSignal[] = [];

        const load = recordingLoader(signals);

        const { unmount } = renderHook(
          () => useApiResource(load)
        );

        unmount();

        expect(signals[0].aborted).toBe(true);
      }
    );


    it(
      "treats a cancelled request as no answer, not an error",
      async () => {
        const load = () => Promise.reject(
          new ApiRequestError({
            message: "The request was cancelled.",
            status: null,
            code: "cancelled",
          })
        );

        const { result } = renderHook(
          () => useApiResource(load)
        );

        await new Promise((settle) => setTimeout(settle, 0));

        expect(result.current).toEqual({
          status: "loading",
        });
      }
    );


    it(
      "loads again when retry is called",
      async () => {
        let calls = 0;

        const load = () => {
          calls += 1;

          return calls === 1
            ? Promise.reject(
              new ApiRequestError({
                message: "The AstroCast server could not be reached.",
                status: null,
                code: "network_error",
              })
            )
            : Promise.resolve("Paris");
        };

        const { result } = renderHook(
          () => useApiResource(load)
        );

        await waitFor(() => {
          expect(result.current.status).toBe("error");
        });

        const current = result.current;

        act(() => {
          if (current.status === "error") {
            current.retry?.();
          }
        });

        await waitFor(() => {
          expect(result.current).toEqual({
            status: "ready",
            data: "Paris",
          });
        });

        expect(calls).toBe(2);
      }
    );


    it(
      "offers no retry for a request the server rejected",
      async () => {
        const load = () => Promise.reject(
          new ApiRequestError({
            message: "Request validation failed.",
            status: 422,
            code: "validation_error",
          })
        );

        const { result } = renderHook(
          () => useApiResource(load)
        );

        await waitFor(() => {
          expect(result.current.status).toBe("error");
        });

        expect(result.current).not.toHaveProperty("retry");
      }
    );
  }
);


describe(
  "mapResource",
  () => {
    it(
      "reshapes ready data and passes other states through",
      () => {
        expect(
          mapResource(
            {
              status: "ready",
              data: 2,
            },
            (value) => value * 10
          )
        ).toEqual({
          status: "ready",
          data: 20,
        });

        expect(
          mapResource(
            {
              status: "error",
              message: "Failed.",
            },
            (value: number) => value * 10
          )
        ).toEqual({
          status: "error",
          message: "Failed.",
        });
      }
    );
  }
);
