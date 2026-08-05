import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CurrentSpaceWeather,
} from "../api/astrocastApi";

import SpaceWeatherCard from "./SpaceWeatherCard";


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


describe(
  "SpaceWeatherCard",
  () => {
    it(
      "shows the loading state",
      () => {
        render(
          <SpaceWeatherCard
            data={null}
            isLoading
            errorMessage=""
          />
        );

        expect(
          screen.getByText(
            "Loading NOAA geomagnetic data..."
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "shows the error state",
      () => {
        render(
          <SpaceWeatherCard
            data={null}
            isLoading={false}
            errorMessage={
              "NOAA data is unavailable."
            }
          />
        );

        expect(
          screen.getByText(
            "NOAA data is unavailable."
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "shows normalized space weather data",
      () => {
        render(
          <SpaceWeatherCard
            data={SPACE_WEATHER_DATA}
            isLoading={false}
            errorMessage=""
          />
        );

        expect(
          screen.getByText("Kp 1.67")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Below geomagnetic storm level"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("Below G1")
        ).toBeInTheDocument();

        expect(
          screen.getByText("8")
        ).toBeInTheDocument();

        expect(
          screen.getByText("6")
        ).toBeInTheDocument();

        expect(
          screen.getByText("current")
        ).toBeInTheDocument();
      }
    );
  }
);