import {
  act,
  render,
  screen,
  within,
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
  clearSearchHistory,
  getForecastHistory,
  listRecentSearches,
} from "../api/historyApi";

import {
  getForecast,
} from "../api/observeApi";

import {
  getCurrentSpaceWeather,
} from "../api/spaceWeatherApi";

import {
  ApiRequestError,
} from "../api/client";

import type {
  ForecastHistoryResponse,
  ForecastResponse,
  ForecastSnapshotSummary,
  RecentSearchListResponse,
  SavedLocation,
} from "../api/types/observe";

import type {
  CurrentSpaceWeatherResponse,
} from "../api/types/spaceWeather";

import {
  FORECAST_FIXTURE,
} from "../test/forecastFixture";

import {
  WITH_SIGNAL,
} from "../test/matchers";


vi.mock(
  "../api/historyApi",
  () => ({
    clearSearchHistory: vi.fn(),
    getForecastHistory: vi.fn(),
    listRecentSearches: vi.fn(),
  })
);

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

const mockedListRecentSearches =
  vi.mocked(listRecentSearches);

const mockedGetForecastHistory =
  vi.mocked(getForecastHistory);

const mockedClearSearchHistory =
  vi.mocked(clearSearchHistory);


const NEW_BRUNSWICK: SavedLocation = {
  ...FORECAST_FIXTURE.location,
  id: 7,
};

const PARIS: SavedLocation = {
  id: 9,
  name: "Paris",
  region: "Ile-de-France",
  country: "France",
  latitude: 48.85341,
  longitude: 2.3488,
  timezone: "Europe/Paris",
};

function check(
  retrievedAt: string,
  forecastTime: string,
  score: number,
  rating: ForecastSnapshotSummary["rating"]
): ForecastSnapshotSummary {
  return {
    retrieved_at: retrievedAt,
    forecast_time: forecastTime,
    score,
    rating,
    limiting_factor: null,
    best_window_first_hour: null,
    best_window_last_hour: null,
    best_window_qualifies: null,
  };
}

const RECENT_SEARCHES: RecentSearchListResponse = {
  count: 2,

  searches: [
    {
      location: NEW_BRUNSWICK,
      latest: check(
        "2026-10-19T21:05:00Z",
        "2026-10-19T22:00",
        76,
        "Good"
      ),
    },

    {
      location: PARIS,
      latest: check(
        "2026-10-19T20:40:00Z",
        "2026-10-19T22:00",
        88,
        "Excellent"
      ),
    },
  ],
};

const NO_SEARCHES: RecentSearchListResponse = {
  count: 0,
  searches: [],
};

// Newest first: two checks of tonight, then one of the night before.
const NEW_BRUNSWICK_HISTORY: ForecastHistoryResponse = {
  location: NEW_BRUNSWICK,
  count: 3,

  snapshots: [
    check("2026-10-19T21:05:00Z", "2026-10-19T22:00", 76, "Good"),
    check("2026-10-19T18:30:00Z", "2026-10-19T22:00", 69, "Good"),
    check("2026-10-18T20:00:00Z", "2026-10-18T22:00", 81, "Excellent"),
  ],
};


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

      mockedListRecentSearches
        .mockResolvedValue(
          NO_SEARCHES
        );

      mockedGetForecastHistory
        .mockResolvedValue(
          NEW_BRUNSWICK_HISTORY
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
          "New Brunswick",
          WITH_SIGNAL
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


    it(
      "lists recent searches with when each was checked",
      async () => {
        mockedListRecentSearches.mockResolvedValue(
          RECENT_SEARCHES
        );

        render(<ObserveTonight />);

        const recent = await screen.findByRole(
          "list",
          {
            name: "Recent searches",
          }
        );

        expect(
          within(recent).getByText("New Brunswick, New Jersey")
        ).toBeInTheDocument();

        expect(
          within(recent).getByText(
            /76 Good,\s+checked 2026-10-19 21:05 UTC for 2026-10-19 22:00 local time/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "says when nothing has been searched yet",
      async () => {
        render(<ObserveTonight />);

        expect(
          await screen.findByText(
            "No searches yet. Each city you check is added here."
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "checks a recent search again when it is chosen",
      async () => {
        const user = userEvent.setup();

        mockedListRecentSearches.mockResolvedValue(
          RECENT_SEARCHES
        );

        render(<ObserveTonight />);

        await user.click(
          await screen.findByRole(
            "button",
            {
              name: /Paris, Ile-de-France/,
            }
          )
        );

        expect(mockedGetForecast).toHaveBeenCalledWith(
          "Paris",
          WITH_SIGNAL
        );

        expect(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          )
        ).toHaveValue("Paris");
      }
    );


    it(
      "refreshes the recent searches after a search",
      async () => {
        const user = userEvent.setup();

        render(<ObserveTonight />);

        await screen.findByText(
          /No searches yet/
        );

        expect(mockedListRecentSearches).toHaveBeenCalledTimes(1);

        await user.type(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          ),
          "New Brunswick{Enter}"
        );

        await screen.findByText(
          FORECAST_FIXTURE.stargazing.explanation
        );

        expect(mockedListRecentSearches).toHaveBeenCalledTimes(2);
      }
    );


    it(
      "shows earlier checks, comparing only the same night",
      async () => {
        const user = userEvent.setup();

        render(<ObserveTonight />);

        await user.type(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          ),
          "New Brunswick{Enter}"
        );

        const checks = await screen.findByRole(
          "list",
          {
            name: "Earlier checks",
          }
        );

        expect(mockedGetForecastHistory).toHaveBeenCalledWith(
          7,
          undefined,
          WITH_SIGNAL
        );

        const entries = within(checks).getAllByRole("listitem");

        expect(entries).toHaveLength(3);

        expect(
          within(entries[0]).getByText(
            "+7 since the previous check"
          )
        ).toBeInTheDocument();

        expect(
          within(entries[0]).getByText(/\(latest\)/)
        ).toBeInTheDocument();

        // The check before it was for the same night, and the one after
        // that for a different night, so neither has a change to show.
        expect(
          within(entries[1]).queryByText(/since the previous check/)
        ).not.toBeInTheDocument();

        expect(
          within(entries[2]).getByText(
            /for 2026-10-18 22:00 local time/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "explains when a forecast could not be saved to the history",
      async () => {
        const user = userEvent.setup();

        mockedGetForecast.mockResolvedValue({
          ...FORECAST_FIXTURE,
          location_id: null,
        });

        render(<ObserveTonight />);

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
            /could not be saved to the history/
          )
        ).toBeInTheDocument();

        expect(mockedGetForecastHistory).not.toHaveBeenCalled();
      }
    );


    it(
      "keeps the forecast working when the history is unavailable",
      async () => {
        const user = userEvent.setup();

        mockedListRecentSearches.mockRejectedValue(
          new Error(
            "Search history is unavailable because the database could not be reached."
          )
        );

        render(<ObserveTonight />);

        expect(
          await screen.findByText(
            /Search history is unavailable/
          )
        ).toBeInTheDocument();

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
            FORECAST_FIXTURE.stargazing.explanation
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "clears the history only after it is confirmed",
      async () => {
        const user = userEvent.setup();

        mockedListRecentSearches.mockResolvedValueOnce(
          RECENT_SEARCHES
        );

        mockedClearSearchHistory.mockResolvedValue({
          deleted_locations: 2,
          deleted_snapshots: 5,
        });

        render(<ObserveTonight />);

        await user.click(
          await screen.findByRole(
            "button",
            {
              name: "Clear history",
            }
          )
        );

        // Asking is not clearing.
        expect(mockedClearSearchHistory).not.toHaveBeenCalled();

        const confirm = screen.getByRole(
          "group",
          {
            name: "Confirm clearing the search history",
          }
        );

        // Focus starts on the safe choice.
        expect(
          within(confirm).getByRole(
            "button",
            {
              name: "Cancel",
            }
          )
        ).toHaveFocus();

        await user.click(
          within(confirm).getByRole(
            "button",
            {
              name: "Yes, clear history",
            }
          )
        );

        expect(mockedClearSearchHistory).toHaveBeenCalledTimes(1);

        expect(
          await screen.findByText(
            "No searches yet. Each city you check is added here."
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "keeps the history when clearing is cancelled",
      async () => {
        const user = userEvent.setup();

        mockedListRecentSearches.mockResolvedValue(
          RECENT_SEARCHES
        );

        render(<ObserveTonight />);

        await user.click(
          await screen.findByRole(
            "button",
            {
              name: "Clear history",
            }
          )
        );

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Cancel",
            }
          )
        );

        expect(mockedClearSearchHistory).not.toHaveBeenCalled();

        expect(
          screen.getByRole(
            "list",
            {
              name: "Recent searches",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "keeps the list and says why when clearing fails",
      async () => {
        const user = userEvent.setup();

        mockedListRecentSearches.mockResolvedValue(
          RECENT_SEARCHES
        );

        mockedClearSearchHistory.mockRejectedValue(
          new Error(
            "Search history is unavailable because the database could not be reached."
          )
        );

        render(<ObserveTonight />);

        await user.click(
          await screen.findByRole(
            "button",
            {
              name: "Clear history",
            }
          )
        );

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Yes, clear history",
            }
          )
        );

        const confirm = screen.getByRole(
          "group",
          {
            name: "Confirm clearing the search history",
          }
        );

        expect(
          await within(confirm).findByText(
            /database could not be reached/
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "list",
            {
              name: "Recent searches",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "stops showing earlier checks that were just cleared",
      async () => {
        const user = userEvent.setup();

        mockedListRecentSearches.mockResolvedValue(
          RECENT_SEARCHES
        );

        mockedClearSearchHistory.mockResolvedValue({
          deleted_locations: 2,
          deleted_snapshots: 5,
        });

        render(<ObserveTonight />);

        await user.type(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          ),
          "New Brunswick{Enter}"
        );

        await screen.findByRole(
          "list",
          {
            name: "Earlier checks",
          }
        );

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Clear history",
            }
          )
        );

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Yes, clear history",
            }
          )
        );

        expect(
          await screen.findByText(
            "The search history was cleared. Your next check of New Brunswick starts a new one."
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            "list",
            {
              name: "Earlier checks",
            }
          )
        ).not.toBeInTheDocument();
      }
    );


    it(
      "lets a newer search replace one still running",
      async () => {
        const user = userEvent.setup();

        const signals: AbortSignal[] = [];

        const parisForecast: ForecastResponse = {
          ...FORECAST_FIXTURE,
          location: PARIS,
          location_id: 9,
          stargazing: {
            ...FORECAST_FIXTURE.stargazing,
            explanation: "Paris looks clear tonight.",
          },
        };

        const denverForecast: ForecastResponse = {
          ...FORECAST_FIXTURE,
          stargazing: {
            ...FORECAST_FIXTURE.stargazing,
            explanation: "Denver looks cloudy tonight.",
          },
        };

        let answerDenver: (forecast: ForecastResponse) => void = () => {};

        mockedGetForecast.mockImplementation(
          (city, options) => {
            if (options?.signal) {
              signals.push(options.signal);
            }

            return city === "Denver"
              ? new Promise((settle) => {
                answerDenver = settle;
              })
              : Promise.resolve(parisForecast);
          }
        );

        render(<ObserveTonight />);

        const box = screen.getByRole(
          "textbox",
          {
            name: "City",
          }
        );

        await user.type(box, "Denver{Enter}");

        expect(
          screen.getByRole(
            "button",
            {
              name: "Checking...",
            }
          )
        ).toBeDisabled();

        // Another city frees the button again.
        await user.clear(box);
        await user.type(box, "Paris");

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Check Sky",
            }
          )
        );

        expect(
          await screen.findByText("Paris looks clear tonight.")
        ).toBeInTheDocument();

        // The Denver request was cancelled, not left to finish.
        expect(signals[0].aborted).toBe(true);

        // Even if its answer still arrives, it must not replace Paris.
        await act(async () => {
          answerDenver(denverForecast);
        });

        expect(
          screen.getByText("Paris looks clear tonight.")
        ).toBeInTheDocument();

        expect(
          screen.queryByText("Denver looks cloudy tonight.")
        ).not.toBeInTheDocument();
      }
    );


    it(
      "treats the same city in any case as a repeat and does not send it again",
      async () => {
        const user = userEvent.setup();

        mockedGetForecast.mockImplementation(
          () => new Promise(() => {})
        );

        render(<ObserveTonight />);

        const box = screen.getByRole(
          "textbox",
          {
            name: "City",
          }
        );

        await user.type(box, "Denver{Enter}");

        await user.clear(box);
        await user.type(box, "  denver ");

        expect(
          screen.getByRole(
            "button",
            {
              name: "Checking...",
            }
          )
        ).toBeDisabled();

        expect(mockedGetForecast).toHaveBeenCalledTimes(1);

        expect(
          screen.getByText("Checking tonight's sky for Denver...")
        ).toBeInTheDocument();
      }
    );


    it(
      "offers Try again when the server could not be reached",
      async () => {
        const user = userEvent.setup();

        mockedGetForecast
          .mockRejectedValueOnce(
            new ApiRequestError({
              message: "The AstroCast server could not be reached. Check that the backend is running, then try again.",
              status: null,
              code: "network_error",
            })
          )
          .mockResolvedValueOnce(
            FORECAST_FIXTURE
          );

        render(<ObserveTonight />);

        await user.type(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          ),
          "New Brunswick{Enter}"
        );

        await user.click(
          await screen.findByRole(
            "button",
            {
              name: "Try again",
            }
          )
        );

        expect(
          await screen.findByText(
            FORECAST_FIXTURE.stargazing.explanation
          )
        ).toBeInTheDocument();

        expect(mockedGetForecast).toHaveBeenCalledTimes(2);
        expect(mockedGetForecast.mock.calls[1][0]).toBe("New Brunswick");
      }
    );


    it(
      "offers no Try again for a city that does not exist",
      async () => {
        const user = userEvent.setup();

        mockedGetForecast.mockRejectedValue(
          new ApiRequestError({
            message: "No location found for city: Atlantis",
            status: 404,
            code: "not_found",
          })
        );

        render(<ObserveTonight />);

        await user.type(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          ),
          "Atlantis{Enter}"
        );

        expect(
          await screen.findByText(
            "No location found for city: Atlantis"
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            "button",
            {
              name: "Try again",
            }
          )
        ).not.toBeInTheDocument();
      }
    );
  }
);
