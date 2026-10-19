import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getCurrentSpaceWeather,
  getCurrentSpaceWeatherRisk,
  getKpTrend,
  getSolarWindTrend,
  getSpaceWeatherAlert,
  listSpaceWeatherAlerts,
} from "./spaceWeatherApi";


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


describe("space-weather API client", () => {
  it.each([
    [
      "current conditions",
      getCurrentSpaceWeather,
      "/api/space-weather/current",
    ],
    [
      "risk assessment",
      getCurrentSpaceWeatherRisk,
      "/api/space-weather/risk",
    ],
    [
      "alert list",
      () => listSpaceWeatherAlerts(),
      "/api/space-weather/alerts",
    ],
    [
      "alert detail",
      () => getSpaceWeatherAlert(42),
      "/api/space-weather/alerts/42",
    ],
    [
      "Kp trend",
      () => getKpTrend(),
      "/api/space-weather/trends/kp",
    ],
    [
      "solar-wind trend",
      () => getSolarWindTrend(),
      "/api/space-weather/trends/solar-wind",
    ],
  ])(
    "requests the %s endpoint",
    async (_name, request, expectedPath) => {
      await request();

      expect(
        requestedUrl().pathname
      ).toBe(expectedPath);
    }
  );

  it("forwards alert filters under the backend's parameter names", async () => {
    await listSpaceWeatherAlerts({
      severity: "G2",
      type: "watch",
      status: null,
      limit: 50,
    });

    const url = requestedUrl();

    expect(
      Object.fromEntries(url.searchParams)
    ).toEqual({
      severity: "G2",
      type: "watch",
      limit: "50",
    });
  });

  it("forwards a trend time range", async () => {
    await getSolarWindTrend({
      start: "2026-10-12T00:00:00Z",
      end: "2026-10-19T00:00:00Z",
    });

    const url = requestedUrl();

    expect(
      Object.fromEntries(url.searchParams)
    ).toEqual({
      start: "2026-10-12T00:00:00Z",
      end: "2026-10-19T00:00:00Z",
    });
  });
});
