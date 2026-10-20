import {
  render,
  screen,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ObserveTonight from "./ObserveTonight";

import {
  getForecast,
} from "../api/observeApi";

import {
  getCurrentSpaceWeather,
} from "../api/spaceWeatherApi";

import type {
  CurrentSpaceWeatherResponse,
} from "../api/types/spaceWeather";

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
  })
);


const mockedGetCurrentSpaceWeather =
  vi.mocked(getCurrentSpaceWeather);

const mockedGetForecast =
  vi.mocked(getForecast);


const SPACE_WEATHER_DATA:
  CurrentSpaceWeatherResponse = {
    source: "NOAA_SWPC",

    metric_name: "planetary_k_index",

    observed_at:
      "2026-08-03T15:00:00Z",

    ingested_at:
      "2026-08-03T18:30:16Z",

    freshness: {
      status: "current",
      age_minutes: 180,
    },

    geomagnetic_activity: {
      level: "below_storm",
      label: (
        "Below geomagnetic storm level"
      ),
      noaa_scale: null,
      is_storm: false,
    },

    facts: {
      kp: 1.67,
      a_running: 6,
      station_count: 8,
    },

    explanation: (
      "The latest observed planetary "
      + "K-index is 1.67."
    ),

    explanation_detail: {
      summary: (
        "The planetary K-index is 1.67, "
        + "which is below the NOAA G1 "
        + "geomagnetic storm threshold."
      ),
      details: [],
      caveats: [],
    },
  };


describe(
  "ObserveTonight",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedGetCurrentSpaceWeather
        .mockResolvedValue(
          SPACE_WEATHER_DATA
        );

      mockedGetForecast
        .mockResolvedValue(
          FORECAST_FIXTURE
        );
    });


    it(
      "loads global space weather when the page opens",
      async () => {
        render(<ObserveTonight />);

        expect(
          await screen.findByText(
            "Kp 1.67"
          )
        ).toBeInTheDocument();

        expect(
          mockedGetCurrentSpaceWeather
        ).toHaveBeenCalledTimes(1);
      }
    );


    it(
      "loads a city forecast after user input",
      async () => {
        const user = userEvent.setup();

        render(<ObserveTonight />);

        await screen.findByText(
          "Kp 1.67"
        );

        await user.type(
          screen.getByPlaceholderText(
            "Enter city name..."
          ),
          "New Brunswick"
        );

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Check Sky",
            }
          )
        );

        expect(
          await screen.findByText(
            FORECAST_FIXTURE.stargazing.explanation
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("Good")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /New Brunswick, New Jersey/
          )
        ).toBeInTheDocument();

        expect(
          mockedGetForecast
        ).toHaveBeenCalledWith(
          "New Brunswick"
        );
      }
    );


    it(
      "preserves space weather when city lookup fails",
      async () => {
        const user = userEvent.setup();

        mockedGetForecast
          .mockRejectedValueOnce(
            new Error(
              "No location found "
              + "for city: Alabasta"
            )
          );

        render(<ObserveTonight />);

        await screen.findByText(
          "Kp 1.67"
        );

        await user.type(
          screen.getByPlaceholderText(
            "Enter city name..."
          ),
          "Alabasta"
        );

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Check Sky",
            }
          )
        );

        expect(
          await screen.findByText(
            "No location found "
            + "for city: Alabasta"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("Kp 1.67")
        ).toBeInTheDocument();
      }
    );


    it(
      "shows the new sections regardless of the search",
      async () => {
        render(<ObserveTonight />);

        await screen.findByText(
          "Kp 1.67"
        );

        for (const heading of [
          "Hourly conditions",
          "Score breakdown",
          "Not built yet",
        ]) {
          expect(
            screen.getByRole(
              "heading",
              {
                level: 2,
                name: heading,
              }
            )
          ).toBeInTheDocument();
        }

        for (const placeholder of [
          "Moon",
          "Darkness window",
          "Object-specific scores",
        ]) {
          expect(
            screen.getByText(placeholder)
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "labels the city search for screen readers",
      async () => {
        render(<ObserveTonight />);

        await screen.findByText(
          "Kp 1.67"
        );

        expect(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "asks for a city before showing the hourly sections",
      async () => {
        render(<ObserveTonight />);

        await screen.findByText(
          "Kp 1.67"
        );

        expect(
          screen.getAllByText(
            "Search for a city to see tonight hour by hour."
          )
        ).toHaveLength(2);

        expect(
          screen.queryByRole("table")
        ).not.toBeInTheDocument();
      }
    );


    it(
      "fills the hourly table and breakdown from the forecast",
      async () => {
        const user = userEvent.setup();

        render(<ObserveTonight />);

        await screen.findByText(
          "Kp 1.67"
        );

        // Enter submits the search form.
        await user.type(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          ),
          "New Brunswick{Enter}"
        );

        const table = await screen.findByRole("table");

        expect(
          table.querySelectorAll("tbody tr")
        ).toHaveLength(
          FORECAST_FIXTURE.hourly.length
        );

        expect(
          screen.getByText(
            /16 mph, costs 8 points/
          )
        ).toBeInTheDocument();

        expect(
          screen.getAllByText(
            "Limiting factor"
          )
        ).toHaveLength(1);
      }
    );
  }
);