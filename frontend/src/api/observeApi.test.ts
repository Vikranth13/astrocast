import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getForecast,
} from "./observeApi";


const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});


describe("observe API client", () => {
  it("sends the city as an encoded query parameter", async () => {
    fetchMock.mockResolvedValue(
      new Response("{}")
    );

    await getForecast("New Brunswick");

    const [input] = fetchMock.mock.calls[0];
    const url = new URL(String(input));

    expect(url.pathname).toBe("/forecast");

    expect(
      url.searchParams.get("city")
    ).toBe("New Brunswick");
  });

  it("surfaces the backend's message for an unknown city", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "not_found",
            message: "No location found for city: Atlantis",
            details: null,
          },
        }),
        {
          status: 404,
        }
      )
    );

    await expect(
      getForecast("Atlantis")
    ).rejects.toThrow(
      "No location found for city: Atlantis"
    );
  });
});
