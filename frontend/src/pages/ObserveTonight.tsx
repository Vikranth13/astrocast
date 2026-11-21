import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  isCancelled,
  isRetryable,
} from "../api/client";

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

import type {
  ForecastResponse,
} from "../api/types/observe";

import SourceState from "../components/SourceState";
import SpaceWeatherCard from "../components/SpaceWeatherCard";

import CitySearch from "../components/observe/CitySearch";
import ClearHistoryControl from "../components/observe/ClearHistoryControl";
import EarlierChecks from "../components/observe/EarlierChecks";
import HourlyConditionsTable from "../components/observe/HourlyConditionsTable";
import RecentSearches from "../components/observe/RecentSearches";
import ScoreBreakdown from "../components/observe/ScoreBreakdown";
import ScoreReadout from "../components/observe/ScoreReadout";

import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingState from "../components/ui/LoadingState";
import Meter from "../components/ui/Meter";
import MetricCard from "../components/ui/MetricCard";
import PageSection from "../components/ui/PageSection";
import PlaceholderCard from "../components/ui/PlaceholderCard";

import {
  forgetCachedResource,
  useApiResource,
} from "../hooks/useApiResource";

import {
  isSameCity,
} from "../utils/city";

import {
  formatLocalTime,
} from "../utils/format";

import "../components/observe/observe.css";

const SEARCH_PROMPT =
  "Search for a city to see tonight hour by hour.";

const RECENT_SEARCH_LIMIT = 5;

const RECENT_SEARCHES_CACHE_KEY = "locations:recent";

// retryCity is the city to search again, or null when repeating the
// search could not help, such as an unknown city or an empty box.
type SearchError = {
  message: string;
  retryCity: string | null;
};

function fetchRecentSearches(
  options: {
    signal: AbortSignal;
  }
) {
  return listRecentSearches(
    RECENT_SEARCH_LIMIT,
    options
  );
}

const WEEK_SIX_PLACEHOLDERS = [
  {
    title: "Moon",
    message:
      "Moon phase, illumination, and rise and set times arrive in Week 6.",
  },

  {
    title: "Darkness window",
    message:
      "Astronomical twilight and true darkness arrive in Week 6.",
  },

  {
    title: "Object-specific scores",
    message:
      "Per-target visibility scoring arrives in Week 6.",
  },
];

function ObserveTonight() {
  const [city, setCity] = useState("");

  const [forecast, setForecast] =
    useState<ForecastResponse | null>(
      null
    );

  // The city whose forecast is being fetched, or null when no search is
  // running.
  const [searchingCity, setSearchingCity] =
    useState<string | null>(null);

  const [searchError, setSearchError] =
    useState<SearchError | null>(null);

  // The request behind searchingCity. A newer search for a different
  // city cancels it.
  const searchRequest = useRef<{
    city: string;
    controller: AbortController;
  } | null>(null);

  // Leaving the page cancels a search still running.
  useEffect(() => {
    const request = searchRequest;

    return () => {
      request.current?.controller.abort();
    };
  }, []);

  const spaceWeather = useApiResource(
    getCurrentSpaceWeather
  );

  // A new loader identity makes the list load again. Replacing it after
  // each successful search brings the city just checked to the top. The
  // cache key keeps the previous list on screen while that happens.
  const [loadRecent, setLoadRecent] = useState(
    () => fetchRecentSearches
  );

  const recentSearches = useApiResource(
    loadRecent,
    RECENT_SEARCHES_CACHE_KEY
  );

  // Set when the history is cleared while a forecast is on screen. Its
  // earlier checks were deleted, so they are not shown again until the
  // next search starts a new history.
  const [isHistoryCleared, setIsHistoryCleared] =
    useState(false);

  const loadHistory = useMemo(
    () => {
      const locationId = forecast?.location_id;

      return locationId
        ? (options: { signal: AbortSignal }) =>
          getForecastHistory(
            locationId,
            undefined,
            options
          )
        : null;
    },
    [forecast]
  );

  const earlierChecks = useApiResource(
    loadHistory
  );

  async function runSearch(
    cityName: string
  ) {
    const trimmedCity = cityName.trim();

    if (!trimmedCity) {
      setSearchError({
        message: "Please enter a city.",
        retryCity: null,
      });
      return;
    }

    // Asking for the city already being fetched would only fetch the same
    // answer twice.
    if (
      searchRequest.current !== null
      && isSameCity(
        searchRequest.current.city,
        trimmedCity
      )
    ) {
      return;
    }

    // A search for a different city replaces the one still running.
    searchRequest.current?.controller.abort();

    const controller = new AbortController();

    searchRequest.current = {
      city: trimmedCity,
      controller,
    };

    setSearchingCity(trimmedCity);
    setSearchError(null);
    setForecast(null);

    try {
      const data = await getForecast(
        trimmedCity,
        {
          signal: controller.signal,
        }
      );

      // A newer search may have started while this one was finishing.
      if (controller.signal.aborted) {
        return;
      }

      setForecast(data);

      setIsHistoryCleared(false);

      setLoadRecent(
        () => (options: { signal: AbortSignal }) =>
          fetchRecentSearches(options)
      );
    } catch (error) {
      if (
        controller.signal.aborted
        || isCancelled(error)
      ) {
        return;
      }

      setSearchError({
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
        // An unknown city stays unknown however often it is asked for,
        // so only failures worth repeating offer Try again.
        retryCity: isRetryable(error)
          ? trimmedCity
          : null,
      });
    } finally {
      // Only the newest search clears the busy state.
      if (searchRequest.current?.controller === controller) {
        searchRequest.current = null;

        setSearchingCity(null);
      }
    }
  }

  function handleCheckSky() {
    runSearch(city);
  }

  function handleRecentSearch(
    cityName: string
  ) {
    setCity(cityName);

    runSearch(cityName);
  }

  // A failure is left to propagate, so the confirmation stays open and
  // shows the error.
  async function handleClearHistory() {
    await clearSearchHistory();

    // The cached list describes rows that no longer exist.
    forgetCachedResource(
      RECENT_SEARCHES_CACHE_KEY
    );

    setLoadRecent(
      () => (options: { signal: AbortSignal }) =>
        fetchRecentSearches(options)
    );

    setIsHistoryCleared(true);
  }

  return (
    <section className="page observe-page">
      <h1>Observe Tonight</h1>

      <p className="page-intro">
        Check sky conditions for a city, and see what is
        working for and against you tonight.
      </p>

      <div className="page-sections">
        <div className="ui-stack">
          {/* Busy only while the box still names the city being checked.
              Type another city and the button is free again, and using it
              replaces the search still running. */}
          <CitySearch
            value={city}
            isChecking={
              searchingCity !== null
              && isSameCity(searchingCity, city)
            }
            onChange={setCity}
            onSubmit={handleCheckSky}
          />

          {searchingCity !== null && (
            <LoadingState
              message={`Checking tonight's sky for ${searchingCity}...`}
            />
          )}

          {searchError && (
            <ErrorState
              message={searchError.message}
              onRetry={
                searchError.retryCity === null
                  ? undefined
                  : () => runSearch(
                    searchError.retryCity ?? ""
                  )
              }
            />
          )}
        </div>

        <PageSection
          title="Recent searches"
          description="Places searched on this AstroCast server, most recent first. Choose one to check it again."
        >
          <SourceState
            resource={recentSearches}
            loadingMessage="Loading recent searches..."
          >
            {(data) => (
              data.count === 0 ? (
                <EmptyState
                  message="No searches yet. Each city you check is added here."
                />
              ) : (
                <div className="ui-stack">
                  <RecentSearches
                    searches={data.searches}
                    checkingCity={searchingCity}
                    onSelect={handleRecentSearch}
                  />

                  <ClearHistoryControl
                    onConfirm={handleClearHistory}
                  />
                </div>
              )
            )}
          </SourceState>
        </PageSection>

        <PageSection
          title="Tonight's forecast"
          description="Live conditions for the city you search."
        >
          <div className="ui-grid ui-grid-compact">
            <Card className="ui-span-all">
              <div className="ui-stack">
                <ScoreReadout
                  score={
                    forecast
                      ? forecast.stargazing.score
                      : null
                  }
                  rating={
                    forecast?.stargazing.rating
                  }
                />

                {forecast && (
                  <Meter
                    percent={
                      forecast.stargazing.score
                    }
                  />
                )}

                <p className="ui-muted">
                  {forecast
                    ? forecast.stargazing.explanation
                    : (
                      "Enter a city to see whether tonight "
                      + "is a good night for observing the sky."
                    )}
                </p>
              </div>
            </Card>

            <MetricCard
              label="Cloud cover"
              value={
                forecast?.conditions
                  .cloud_cover_percent
              }
              unit="%"
            />

            <MetricCard
              label="Rain chance"
              value={
                forecast?.conditions
                  .precipitation_probability_percent
              }
              unit="%"
            />

            <MetricCard
              label="Temperature"
              value={
                forecast?.conditions
                  .temperature_f
              }
              unit="°F"
            />

            <MetricCard
              label="Wind speed"
              value={
                forecast?.conditions
                  .wind_speed_mph
              }
              unit="mph"
            />

            <MetricCard
              label="Visibility"
              value={
                forecast?.conditions
                  .visibility_miles
              }
              unit="mi"
            />
          </div>

          {forecast && (
            <Card>
              <div className="observe-location">
                <span className="ui-eyebrow">
                  Location
                </span>

                <p>
                  {forecast.location.name}

                  {forecast.location.region
                    ? `, ${forecast.location.region}`
                    : ""}
                </p>

                <p className="ui-muted">
                  {forecast.location.country}
                </p>

                <p className="ui-muted">
                  Forecast time:{" "}
                  {formatLocalTime(
                    forecast.forecast_time
                  )}
                </p>
              </div>
            </Card>
          )}
        </PageSection>

        {forecast && (
          <PageSection
            title="Earlier checks"
            description={`Saved forecasts for ${forecast.location.name}, newest first. Checks within the same hour update one entry.`}
          >
            {isHistoryCleared ? (
              <EmptyState
                message={`The search history was cleared. Your next check of ${forecast.location.name} starts a new one.`}
              />
            ) : forecast.location_id === null ? (
              <EmptyState
                message="This forecast could not be saved to the history, so earlier checks are unavailable right now. The forecast above is unaffected."
              />
            ) : (
              <SourceState
                resource={earlierChecks}
                loadingMessage="Loading earlier checks..."
              >
                {(history) => (
                  <div className="ui-stack">
                    <EarlierChecks
                      snapshots={history.snapshots}
                    />

                    {history.count === 1 && (
                      <p className="ui-caption">
                        This is the first saved check for{" "}
                        {forecast.location.name}. Check again in an
                        hour or more to see how tonight's forecast
                        changes.
                      </p>
                    )}
                  </div>
                )}
              </SourceState>
            )}
          </PageSection>
        )}

        <PageSection
          title="Space weather"
          description="Global geomagnetic activity from stored NOAA data."
        >
          <SpaceWeatherCard
            data={
              spaceWeather.status === "ready"
                ? spaceWeather.data
                : null
            }
            isLoading={
              spaceWeather.status === "loading"
            }
            errorMessage={
              spaceWeather.status === "error"
                ? spaceWeather.message
                : ""
            }
            onRetry={
              spaceWeather.status === "error"
                ? spaceWeather.retry
                : undefined
            }
          />
        </PageSection>

        <PageSection
          title="Hourly conditions"
          description="Every hour of tonight's observing window, scored with the same rules as the headline score."
        >
          {forecast ? (
            forecast.hourly.length > 0 ? (
              <HourlyConditionsTable
                hours={forecast.hourly}
              />
            ) : (
              <EmptyState
                message="No hourly readings were available for tonight."
              />
            )
          ) : (
            <EmptyState message={SEARCH_PROMPT} />
          )}
        </PageSection>

        <PageSection
          title="Score breakdown"
          description="How each condition moved the score for the forecast hour."
        >
          {forecast ? (
            <ScoreBreakdown
              factors={
                forecast.stargazing.factors
              }
            />
          ) : (
            <EmptyState message={SEARCH_PROMPT} />
          )}
        </PageSection>

        <PageSection
          title="Not built yet"
          description="Astronomy intelligence is Week 6."
        >
          <div className="ui-grid">
            {WEEK_SIX_PLACEHOLDERS.map(
              (placeholder) => (
                <PlaceholderCard
                  key={placeholder.title}
                  title={placeholder.title}
                  message={placeholder.message}
                />
              )
            )}
          </div>
        </PageSection>
      </div>
    </section>
  );
}

export default ObserveTonight;
