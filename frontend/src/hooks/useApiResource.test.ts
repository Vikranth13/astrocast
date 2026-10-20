import {
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

        await waitFor(() => {
          expect(result.current).toEqual({
            status: "error",
            message: "Upstream failed.",
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
