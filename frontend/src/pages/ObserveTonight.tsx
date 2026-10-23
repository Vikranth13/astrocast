import {
  useEffect,
  useState,
} from "react";

import {
  getForecast,
} from "../api/observeApi";

import {
  getCurrentSpaceWeather,
} from "../api/spaceWeatherApi";

import type {
  ForecastResponse,
} from "../api/types/observe";

import type {
  CurrentSpaceWeatherResponse,
} from "../api/types/spaceWeather";

import SpaceWeatherCard from "../components/SpaceWeatherCard";

import CitySearch from "../components/observe/CitySearch";
import HourlyConditionsTable from "../components/observe/HourlyConditionsTable";
import ScoreBreakdown from "../components/observe/ScoreBreakdown";
import ScoreReadout from "../components/observe/ScoreReadout";

import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Meter from "../components/ui/Meter";
import MetricCard from "../components/ui/MetricCard";
import PageSection from "../components/ui/PageSection";
import PlaceholderCard from "../components/ui/PlaceholderCard";

import {
  formatLocalTime,
} from "../utils/format";

import "../components/observe/observe.css";

const SEARCH_PROMPT =
  "Search for a city to see tonight hour by hour.";

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

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    spaceWeather,
    setSpaceWeather,
  ] = useState<CurrentSpaceWeatherResponse | null>(
    null
  );

  const [
    isSpaceWeatherLoading,
    setIsSpaceWeatherLoading,
  ] = useState(true);

  const [
    spaceWeatherError,
    setSpaceWeatherError,
  ] = useState("");

  useEffect(() => {
    let ignoreResult = false;

    async function loadSpaceWeather() {
      try {
        setIsSpaceWeatherLoading(true);
        setSpaceWeatherError("");

        const data =
          await getCurrentSpaceWeather();

        if (!ignoreResult) {
          setSpaceWeather(data);
        }
      } catch (error) {
        if (ignoreResult) {
          return;
        }

        if (error instanceof Error) {
          setSpaceWeatherError(
            error.message
          );
        } else {
          setSpaceWeatherError(
            "Failed to load space weather."
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsSpaceWeatherLoading(false);
        }
      }
    }

    loadSpaceWeather();

    return () => {
      ignoreResult = true;
    };
  }, []);

  async function handleCheckSky() {
    const trimmedCity = city.trim();

    if (!trimmedCity) {
      setErrorMessage(
        "Please enter a city."
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      setForecast(null);

      const data = await getForecast(
        trimmedCity
      );

      setForecast(data);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Something went wrong."
        );
      }
    } finally {
      setIsLoading(false);
    }
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
          <CitySearch
            value={city}
            isLoading={isLoading}
            onChange={setCity}
            onSubmit={handleCheckSky}
          />

          {errorMessage && (
            <ErrorState
              message={errorMessage}
            />
          )}
        </div>

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

        <PageSection
          title="Space weather"
          description="Global geomagnetic activity from stored NOAA data."
        >
          <SpaceWeatherCard
            data={spaceWeather}
            isLoading={
              isSpaceWeatherLoading
            }
            errorMessage={
              spaceWeatherError
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
