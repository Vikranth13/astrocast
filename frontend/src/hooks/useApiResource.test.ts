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
