import {
  render,
  screen,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import {
  MemoryRouter,
} from "react-router";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import Dashboard from "./Dashboard";

import {
  getForecast,
} from "../api/observeApi";

import {
  getCurrentSpaceWeather,
  getCurrentSpaceWeatherRisk,
  getKpTrend,
  getSolarWindTrend,
  listSpaceWeatherAlerts,
} from "../api/spaceWeatherApi";

import {
  MOCK_ALERTS,
  MOCK_CURRENT_CONDITIONS,
  MOCK_RISK,
} from "../data/mockSpaceWeather";

import {
  MOCK_KP_TREND,
  MOCK_SOLAR_WIND_TREND,
} from "../data/mockTrends";

import {
  FORECAST_FIXTURE,
} from "../test/forecastFixture";


vi.mock(
  "../api/observeApi",
  () => ({
    getForecast: vi.fn(),
  })
);

vi.mock(
  "../api/spaceWeatherApi",
  () => ({
    getCurrentSpaceWeather: vi.fn(),
    getCurrentSpaceWeatherRisk: vi.fn(),
    getKpTrend: vi.fn(),
    getSolarWindTrend: vi.fn(),
    listSpaceWeatherAlerts: vi.fn(),
  })
);


const mockedGetForecast = vi.mocked(getForecast);
const mockedGetCurrent = vi.mocked(getCurrentSpaceWeather);
const mockedGetRisk = vi.mocked(getCurrentSpaceWeatherRisk);
const mockedGetKpTrend = vi.mocked(getKpTrend);
const mockedGetSolarWindTrend = vi.mocked(getSolarWindTrend);
const mockedListAlerts = vi.mocked(listSpaceWeatherAlerts);

const DAY_MS = 24 * 60 * 60 * 1000;

const SEARCH_PROMPT =
  "Search for a city to see tonight's observing conditions.";

// The last 24 hours of the shared mock week: eight three-hour readings.
const LAST_DAY_KP = {
  ...MOCK_KP_TREND,
  count: 8,
  points: MOCK_KP_TREND.points.slice(-8),
};

const LAST_DAY_SOLAR_WIND = {
  ...MOCK_SOLAR_WIND_TREND,
  count: 8,
  points: MOCK_SOLAR_WIND_TREND.points.slice(-8),
};


function renderDashboard(
  path = "/"
) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
    >
      <Dashboard />
    </MemoryRouter>
  );
}


describe(
  "Dashboard",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedGetForecast.mockResolvedValue(
        FORECAST_FIXTURE
      );

      mockedGetCurrent.mockResolvedValue(
        MOCK_CURRENT_CONDITIONS
      );

      mockedGetRisk.mockResolvedValue(
        MOCK_RISK
      );

      mockedListAlerts.mockResolvedValue({
        count: 1,
        alerts: [MOCK_ALERTS[0]],
      });

      mockedGetKpTrend.mockResolvedValue(
        LAST_DAY_KP
      );

      mockedGetSolarWindTrend.mockResolvedValue(
        LAST_DAY_SOLAR_WIND
      );
    });


    it(
      "groups the cards into titled sections",
      async () => {
        renderDashboard();

        await screen.findByText("Kp 5.33");

        for (const title of [
          "Tonight",
          "Sky and space weather",
          "Recent movement",
        ]) {
          expect(
            screen.getByRole(
              "region",
              {
                name: title,
              }
            )
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "asks for a city before loading a forecast",
      async () => {
        renderDashboard();

        await screen.findByText("Kp 5.33");

        expect(
          screen.getAllByText(SEARCH_PROMPT)
        ).toHaveLength(2);

        expect(mockedGetForecast).not.toHaveBeenCalled();
      }
    );


    it(
      "loads the city from the address and shows the backend's breakdown",
      async () => {
        renderDashboard("/?city=New%20Brunswick");

        expect(
          await screen.findByText(
            FORECAST_FIXTURE.stargazing.explanation
          )
        ).toBeInTheDocument();

        expect(mockedGetForecast).toHaveBeenCalledWith(
          "New Brunswick"
        );

        expect(
          screen.getByText("Limiting factor: Wind speed")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "New Brunswick, New Jersey at 22:00 local time"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("20:00 to 05:00")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "10 hours rated Good or better, peaking at 02:00 (90, Excellent)."
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "searches from the dashboard",
      async () => {
        const user = userEvent.setup();

        renderDashboard();

        await user.type(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          ),
          "New Brunswick{Enter}"
        );

        expect(
          await screen.findByText(
            "Limiting factor: Wind speed"
          )
        ).toBeInTheDocument();

        expect(mockedGetForecast).toHaveBeenCalledWith(
          "New Brunswick"
        );
      }
    );


    it(
      "says plainly when no hour reaches Good",
      async () => {
        mockedGetForecast.mockResolvedValue({
          ...FORECAST_FIXTURE,
          best_window: {
            first_hour: "2026-10-20T03:00",
            last_hour: "2026-10-20T03:00",
            hour_count: 1,
            peak_time: "2026-10-20T03:00",
            peak_score: 52,
            peak_rating: "Okay",
            qualifies: false,
          },
        });

        renderDashboard("/?city=Paris");

        expect(
          await screen.findByText("No good window")
        ).toBeInTheDocument();

        expect(
          screen.getByText(/The best\s+hour is 03:00 \(52, Okay\)/)
        ).toBeInTheDocument();
      }
    );


    it(
      "shows geomagnetic activity with its freshness and observation time",
      async () => {
        renderDashboard();

        expect(
          await screen.findByText("Kp 5.33")
        ).toBeInTheDocument();

        expect(
          screen.getByText("Minor geomagnetic storm")
        ).toBeInTheDocument();

        expect(
          await screen.findByText("moderate risk")
        ).toHaveClass("ui-badge-caution");

        expect(
          screen.getByText("Observed 2026-09-06 21:00 UTC")
        ).toBeInTheDocument();

        expect(
          screen.getByText("42 minutes old")
        ).toBeInTheDocument();
      }
    );


    it(
      "keeps a failed source inside its own card",
      async () => {
        mockedGetCurrent.mockRejectedValue(
          new Error(
            "No stored data is available yet."
          )
        );

        renderDashboard("/?city=New%20Brunswick");

        expect(
          await screen.findByText(
            "No stored data is available yet."
          )
        ).toBeInTheDocument();

        // Every other card still renders its own data.
        expect(
          await screen.findByText(
            "Limiting factor: Wind speed"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "link",
            {
              name: "Geomagnetic K-index of 5 expected",
            }
          )
        ).toHaveAttribute(
          "href",
          "/alerts/7"
        );

        expect(
          screen.getByText(
            "up 3.00 across the last 24 hours"
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "keeps the geomagnetic card when only the risk assessment fails",
      async () => {
        mockedGetRisk.mockRejectedValue(
          new Error("Risk service failed.")
        );

        renderDashboard();

        expect(
          await screen.findByText(
            "Risk assessment unavailable: Risk service failed."
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("Kp 5.33")
        ).toBeInTheDocument();
      }
    );


    it(
      "keeps space weather when the forecast fails",
      async () => {
        mockedGetForecast.mockRejectedValue(
          new Error(
            "The location search service could not be reached. Try again in a few minutes."
          )
        );

        renderDashboard("/?city=Paris");

        expect(
          await screen.findAllByText(
            "The location search service could not be reached. Try again in a few minutes."
          )
        ).toHaveLength(2);

        expect(
          screen.getByText("Kp 5.33")
        ).toBeInTheDocument();
      }
    );


    it(
      "requests only the last 24 hours of trend data",
      async () => {
        renderDashboard();

        await screen.findByText(
          "up 3.00 across the last 24 hours"
        );

        const [kpQuery] = mockedGetKpTrend.mock.calls[0];
        const [solarWindQuery] = mockedGetSolarWindTrend.mock.calls[0];

        const kpStart = Date.parse(kpQuery?.start ?? "");

        expect(
          Math.abs(Date.now() - DAY_MS - kpStart)
        ).toBeLessThan(60_000);

        expect(solarWindQuery?.limit).toBe(2000);
      }
    );


    it(
      "summarises each trend with its latest reading time",
      async () => {
        renderDashboard();

        expect(
          await screen.findByText(
            "up 3.00 across the last 24 hours"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "up 191 across the last 24 hours"
          )
        ).toBeInTheDocument();

        expect(
          screen.getAllByText(
            "Latest reading 2026-09-06 21:00 UTC"
          )
        ).toHaveLength(2);
      }
    );


    it(
      "says when no readings were stored in the last 24 hours",
      async () => {
        mockedGetKpTrend.mockResolvedValue({
          ...LAST_DAY_KP,
          count: 0,
          points: [],
        });

        renderDashboard();

        expect(
          await screen.findByText(
            "No Kp readings were stored in the last 24 hours."
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "marks Week 6 features as not built instead of inventing values",
      async () => {
        renderDashboard();

        await screen.findByText("Kp 5.33");

        expect(
          screen.getByText(/Moon phase, illumination.*Week 6/)
        ).toBeInTheDocument();

        expect(
          screen.getByText(/Object recommendations arrive in Week 6/)
        ).toBeInTheDocument();
      }
    );
  }
);
