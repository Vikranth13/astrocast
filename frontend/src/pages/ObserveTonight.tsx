import {
  useEffect,
  useState,
} from "react";

import {
  getCurrentSpaceWeather,
  getForecast,
  type AstroCastForecast,
  type CurrentSpaceWeather,
} from "../api/astrocastApi";

import SpaceWeatherCard from "../components/SpaceWeatherCard";

import HourlyConditionsTable from "../components/observe/HourlyConditionsTable";
import ScoreBreakdown from "../components/observe/ScoreBreakdown";

import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

import {
  MOCK_OBSERVE_TONIGHT,
} from "../data/mockObserveTonight";

import "../components/observe/observe.css";

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
    useState<AstroCastForecast | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    spaceWeather,
    setSpaceWeather,
  ] = useState<CurrentSpaceWeather | null>(
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

      <div className="observe">
        <section className="observe-section">
          <div className="observe-search">
            <input
              type="text"
              placeholder="Enter city name..."
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCheckSky();
                }
              }}
            />

            <button
              type="button"
              onClick={handleCheckSky}
              disabled={isLoading}
            >
              {isLoading
                ? "Checking..."
                : "Check Sky"}
            </button>
          </div>

          {errorMessage && (
            <ErrorState
              message={errorMessage}
            />
          )}
        </section>

        <section className="observe-section">
          <SectionHeader
            title="Tonight's forecast"
            description="Live conditions for the city you search."
          />

          <div className="observe-grid">
            <Card className="observe-summary">
              <div className="observe-score">
                <span
                  className={
                    forecast
                      ? "observe-score-value"
                      : "observe-score-value observe-score-empty"
                  }
                >
                  {forecast
                    ? forecast.stargazing.score
                    : "—"}
                </span>

                <span className="observe-score-total">
                  / 100
                </span>

                <span className="observe-score-rating">
                  {forecast
                    ? forecast.stargazing.rating
                    : ""}
                </span>
              </div>

              <p className="observe-note">
                {forecast
                  ? forecast.stargazing.explanation
                  : (
                    "Enter a city to see whether tonight "
                    + "is a good night for observing the sky."
                  )}
              </p>
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
                <span className="observe-card-title">
                  Location
                </span>

                <p>
                  {forecast.location.name}

                  {forecast.location.region
                    ? `, ${forecast.location.region}`
                    : ""}
                </p>

                <p className="observe-note">
                  {forecast.location.country}
                </p>

                <p className="observe-note">
                  Forecast time:{" "}
                  {forecast.forecast_time}
                </p>
              </div>
            </Card>
          )}
        </section>

        <section className="observe-section">
          <SectionHeader
            title="Space weather"
            description="Global geomagnetic activity from stored NOAA data."
          />

          <SpaceWeatherCard
            data={spaceWeather}
            isLoading={
              isSpaceWeatherLoading
            }
            errorMessage={
              spaceWeatherError
            }
          />
        </section>

        <section className="observe-section">
          <SectionHeader
            title="Hourly conditions"
            description="A sample night. The backend already fetches hourly weather but does not expose it yet, so this is wired up in Week 5."
          />

          <HourlyConditionsTable
            hours={MOCK_OBSERVE_TONIGHT.hours}
          />
        </section>

        <section className="observe-section">
          <SectionHeader
            title="Score breakdown"
            description="How each factor moves the score, using the thresholds the scoring service already applies. Sample values until Week 5."
          />

          <ScoreBreakdown
            factors={
              MOCK_OBSERVE_TONIGHT.factors
            }
          />
        </section>

        <section className="observe-section">
          <SectionHeader
            title="Not built yet"
            description="Astronomy intelligence is Week 6."
          />

          <div className="observe-grid">
            {WEEK_SIX_PLACEHOLDERS.map(
              (placeholder) => (
                <Card
                  key={placeholder.title}
                >
                  <span className="observe-card-title">
                    {placeholder.title}
                  </span>

                  <EmptyState
                    message={
                      placeholder.message
                    }
                  />
                </Card>
              )
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export default ObserveTonight;
