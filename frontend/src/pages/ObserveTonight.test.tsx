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
  getCurrentSpaceWeather,
  getForecast,
} from "../api/astrocastApi";

import type {
  AstroCastForecast,
  CurrentSpaceWeather,
} from "../api/astrocastApi";


vi.mock(
  "../api/astrocastApi",
  () => ({
    getCurrentSpaceWeather: vi.fn(),
    getForecast: vi.fn(),
  })
);


const mockedGetCurrentSpaceWeather =
  vi.mocked(getCurrentSpaceWeather);

const mockedGetForecast =
  vi.mocked(getForecast);


const SPACE_WEATHER_DATA:
  CurrentSpaceWeather = {
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
  };


const FORECAST_DATA:
  AstroCastForecast = {
    location: {
      name: "New Brunswick",
      region: "New Jersey",
      country: "United States",
      latitude: 40.48622,
      longitude: -74.45182,
      timezone: "America/New_York",
    },

    forecast_time:
      "2026-08-05T22:00:00",

    conditions: {
      cloud_cover_percent: 15,
      precipitation_probability_percent: 5,
      temperature_f: 71,
      wind_speed_mph: 4,
      visibility_miles: 10,
    },

    stargazing: {
      score: 82,
      rating: "Good",
      explanation: (
        "Low cloud cover and good "
        + "visibility support stargazing."
      ),
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
          FORECAST_DATA
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
            "82 / 100"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("Good")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /Location: New Brunswick/
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
  }
);