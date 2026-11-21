import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  clearSearchHistory,
  getForecastHistory,
  listRecentSearches,
} from "./historyApi";


const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);

  fetchMock.mockImplementation(
    async () => new Response("{}")
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});


function requestedUrl(): URL {
  const [input] = fetchMock.mock.calls[0];

  return new URL(String(input));
}


describe(
  "history API client",
  () => {
    it(
      "asks for the five most recent searches by default",
      async () => {
        await listRecentSearches();

        const url = requestedUrl();

        expect(url.pathname).toBe("/api/locations/recent");
        expect(url.searchParams.get("limit")).toBe("5");
      }
    );


    it(
      "asks for one place's forecast history",
      async () => {
        await getForecastHistory(7, 3);

        const url = requestedUrl();

        expect(url.pathname).toBe("/api/locations/7/forecasts");
        expect(url.searchParams.get("limit")).toBe("3");
      }
    );
  }
);


describe(
  "clearing the history",
  () => {
    it(
      "sends a DELETE to the locations collection",
      async () => {
        await clearSearchHistory();

        const [input, init] = fetchMock.mock.calls[0];

        expect(
          new URL(String(input)).pathname
        ).toBe("/api/locations");

        expect(init).toEqual({
          method: "DELETE",
        });
      }
    );
  }
);
