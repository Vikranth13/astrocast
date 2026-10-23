import {
  render,
  screen,
} from "@testing-library/react";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import Trends from "./Trends";

import {
  getKpTrend,
  getSolarWindTrend,
} from "../api/spaceWeatherApi";

import type {
  SolarWindTrendResponse,
} from "../api/types/spaceWeather";

import {
  MOCK_KP_TREND,
  SOLAR_WIND_THRESHOLDS,
} from "../test/trendFixtures";


vi.mock(
  "../api/spaceWeatherApi",
  () => ({
    getKpTrend: vi.fn(),
    getSolarWindTrend: vi.fn(),
  })
);


const mockedGetKpTrend = vi.mocked(getKpTrend);
const mockedGetSolarWindTrend = vi.mocked(getSolarWindTrend);

// The page asks for the seven days before now. Pinning the clock makes
// that week the same one the fixtures cover.
const NOW = new Date("2026-09-07T00:00:00Z");

// Hourly averages as the backend sends them, one hour empty.
const HOURLY_SOLAR_WIND: SolarWindTrendResponse = {
  source: "NOAA_SWPC",
  interval: "hour",
  count: 3,

  points: [
    {
      observed_at: "2026-09-06T19:00:00Z",
      station: null,
      speed_km_s: 588,
      density_per_cm3: 9.1,
      temperature_k: null,
    },

    {
      observed_at: "2026-09-06T20:00:00Z",
      station: null,
      speed_km_s: null,
      density_per_cm3: null,
      temperature_k: null,
    },

    {
      observed_at: "2026-09-06T21:00:00Z",
      station: null,
      speed_km_s: 612,
      density_per_cm3: 8.4,
      temperature_k: null,
    },
  ],

  thresholds: SOLAR_WIND_THRESHOLDS,
};

const UNREACHABLE =
  "The AstroCast server could not be reached. Check that the backend is running, then try again.";


describe(
  "Trends",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      // Only Date is faked, so promises and the test runner's own
      // timers behave normally.
      vi.useFakeTimers({
        toFake: ["Date"],
      });

      vi.setSystemTime(NOW);

      mockedGetKpTrend.mockResolvedValue(
        MOCK_KP_TREND
      );

      mockedGetSolarWindTrend.mockResolvedValue(
        HOURLY_SOLAR_WIND
      );
    });


    afterEach(() => {
      vi.useRealTimers();
    });


    it(
      "asks for the past week, with solar wind as hourly averages",
      async () => {
        render(<Trends />);

        await screen.findAllByText(/^Past 7 days/);

        expect(mockedGetKpTrend).toHaveBeenCalledWith({
          start: "2026-08-31T00:00:00.000Z",
          end: "2026-09-07T00:00:00.000Z",
        });

        expect(mockedGetSolarWindTrend).toHaveBeenCalledWith({
          start: "2026-08-31T00:00:00.000Z",
          end: "2026-09-07T00:00:00.000Z",
          interval: "hour",
        });
      }
    );


    it(
      "charts each stored metric",
      async () => {
        render(<Trends />);

        await screen.findAllByText(/^Past 7 days/);

        for (const title of [
          "Planetary K-index",
          "Solar wind speed",
          "Solar wind density",
        ]) {
          expect(
            screen.getByRole(
              "heading",
              {
                level: 2,
                name: title,
              }
            )
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "states the window and the latest reading in each summary",
      async () => {
        render(<Trends />);

        expect(
          await screen.findByText(
            /^Past 7 days, 2026-08-31 00:00 UTC to 2026-09-07 00:00 UTC\. Latest 5\.33 at 2026-09-06 21:00 UTC\./,
            {
              selector: "figcaption",
            }
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /Latest 612 km\/s at 2026-09-06 21:00 UTC\./,
            {
              selector: "figcaption",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "counts the empty hour on both solar wind charts",
      async () => {
        render(<Trends />);

        expect(
          await screen.findAllByText(
            /across 2 hourly averages\. 1 hour has no stored reading\.$/,
            {
              selector: "figcaption",
            }
          )
        ).toHaveLength(2);
      }
    );


    it(
      "keeps the Kp chart when the solar wind fails",
      async () => {
        mockedGetSolarWindTrend.mockRejectedValue(
          new Error(UNREACHABLE)
        );

        render(<Trends />);

        expect(
          await screen.findAllByText(UNREACHABLE)
        ).toHaveLength(2);

        expect(
          screen.getByText(
            /Latest 5\.33/,
            {
              selector: "figcaption",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "states the source and what a gap means",
      async () => {
        render(<Trends />);

        expect(
          screen.getByText(
            /A gap in a line means no measurement was stored/
          )
        ).toBeInTheDocument();

        await screen.findAllByText(/^Past 7 days/);
      }
    );
  }
);
