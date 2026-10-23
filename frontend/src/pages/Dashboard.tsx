import {
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router";

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

import BestWindowCard from "../components/dashboard/BestWindowCard";
import GeomagneticCard from "../components/dashboard/GeomagneticCard";
import LatestAlertCard from "../components/dashboard/LatestAlertCard";
import MiniTrendCard from "../components/dashboard/MiniTrendCard";
import ObservingStatusCard from "../components/dashboard/ObservingStatusCard";
import ResourceCard from "../components/dashboard/ResourceCard";

import {
  summarizeTrend,
} from "../components/dashboard/trendSummary";

import CitySearch from "../components/observe/CitySearch";

import ErrorState from "../components/ui/ErrorState";
import PageSection from "../components/ui/PageSection";
import PlaceholderCard from "../components/ui/PlaceholderCard";

import {
  mapResource,
  useApiResource,
} from "../hooks/useApiResource";

import {
  MEASUREMENTS,
} from "../utils/measurements";

const LAST_DAY_MS = 24 * 60 * 60 * 1000;

// The solar-wind source reports once a minute, so a day is about 1,440
// readings. 2,000 is the most the trend endpoint returns.
const SOLAR_WIND_DAY_LIMIT = 2000;

const SEARCH_PROMPT =
  "Search for a city to see tonight's observing conditions.";

function lastDayStart(): string {
  return new Date(
    Date.now() - LAST_DAY_MS
  ).toISOString();
}

// Module-level loaders keep the same identity between renders, so each
// source is requested once when the page opens.
function loadLatestAlert() {
  return listSpaceWeatherAlerts({
    limit: 1,
  });
}

function loadKpLastDay() {
  return getKpTrend({
    start: lastDayStart(),
  });
}

function loadSolarWindLastDay() {
  return getSolarWindTrend({
    start: lastDayStart(),
    limit: SOLAR_WIND_DAY_LIMIT,
  });
}

function Dashboard() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const city =
    searchParams.get("city")?.trim() ?? "";

  const [cityInput, setCityInput] =
    useState(city);

  const [searchError, setSearchError] =
    useState("");

  // Keeps the search box in step when the city changes through the
  // address bar or the browser's back button.
  const [syncedCity, setSyncedCity] =
    useState(city);

  if (city !== syncedCity) {
    setSyncedCity(city);
    setCityInput(city);
  }

  const loadForecast = useMemo(
    () => (
      city
        ? () => getForecast(city)
        : null
    ),
    [city]
  );

  // Every source loads on its own. A failure in one only changes the
  // cards that depend on it. The cache keys let the page show its last
  // results straight away when you come back to it from another page.
  const forecast = useApiResource(
    loadForecast,
    `forecast:${city}`
  );

  const current = useApiResource(
    getCurrentSpaceWeather,
    "space-weather:current"
  );

  const risk = useApiResource(
    getCurrentSpaceWeatherRisk,
    "space-weather:risk"
  );

  const latestAlert = useApiResource(
    loadLatestAlert,
    "alerts:latest"
  );

  const kpTrend = useApiResource(
    loadKpLastDay,
    "trends:kp:last-day"
  );

  const solarWindTrend = useApiResource(
    loadSolarWindLastDay,
    "trends:solar-wind:last-day"
  );

  const kpSummary = mapResource(
    kpTrend,
    (trend) => summarizeTrend(
      MEASUREMENTS.kp.label,
      MEASUREMENTS.kp.unit,
      MEASUREMENTS.kp.decimals,
      trend.points
    )
  );

  const solarWindSummary = mapResource(
    solarWindTrend,
    (trend) => summarizeTrend(
      MEASUREMENTS.solar_wind_speed.label,
      MEASUREMENTS.solar_wind_speed.unit,
      MEASUREMENTS.solar_wind_speed.decimals,
      trend.points.map((point) => ({
        observed_at: point.observed_at,
        value: point.speed_km_s,
      }))
    )
  );

  function handleSearch() {
    const trimmedCity = cityInput.trim();

    if (!trimmedCity) {
      setSearchError("Please enter a city.");
      return;
    }

    setSearchError("");

    setSearchParams({
      city: trimmedCity,
    });
  }

  return (
    <section className="page">
      <h1>Dashboard</h1>

      <p className="page-intro">
        Tonight at a glance for the city you choose, alongside global
        space weather from stored NOAA data. Each card loads on its own,
        so one unavailable source never hides the others.
      </p>

      <div className="page-sections">
        <PageSection
          title="Tonight"
          description="Whether it is worth going out, and when."
        >
          <div className="ui-stack">
            <CitySearch
              value={cityInput}
              isLoading={
                forecast.status === "loading"
              }
              onChange={setCityInput}
              onSubmit={handleSearch}
            />

            {searchError && (
              <ErrorState message={searchError} />
            )}

            <div className="ui-grid">
              <ResourceCard
                title="Observing status"
                className="ui-span-2"
                resource={forecast}
                idleMessage={SEARCH_PROMPT}
                loadingMessage="Loading tonight's forecast..."
              >
                {(data) => (
                  <ObservingStatusCard forecast={data} />
                )}
              </ResourceCard>

              <ResourceCard
                title="Best window"
                resource={forecast}
                idleMessage={SEARCH_PROMPT}
                loadingMessage="Loading tonight's forecast..."
                isEmpty={(data) => data.best_window === null}
                emptyMessage="No hourly readings were available for tonight."
              >
                {(data) => data.best_window && (
                  <BestWindowCard
                    bestWindow={data.best_window}
                    hourly={data.hourly}
                  />
                )}
              </ResourceCard>

              <div className="ui-span-all">
                <PlaceholderCard
                  title="Recommended target"
                  message="Object recommendations arrive in Week 6, once object-specific scores exist."
                />
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Sky and space weather"
          description="Global geomagnetic conditions, not a local aurora forecast."
        >
          <div className="ui-grid">
            <PlaceholderCard
              title="Moon"
              message="Moon phase, illumination, and moonrise and moonset times arrive in Week 6."
            />

            <ResourceCard
              title="Geomagnetic activity"
              resource={current}
              loadingMessage="Loading NOAA geomagnetic data..."
            >
              {(data) => (
                <GeomagneticCard
                  current={data}
                  risk={risk}
                />
              )}
            </ResourceCard>

            <ResourceCard
              title="Latest alert"
              resource={latestAlert}
              loadingMessage="Loading NOAA alerts..."
            >
              {(data) => (
                <LatestAlertCard
                  alert={data.alerts[0] ?? null}
                />
              )}
            </ResourceCard>
          </div>
        </PageSection>

        <PageSection
          title="Recent movement"
          description="Stored observations from the last 24 hours."
        >
          <div className="ui-grid">
            <ResourceCard
              title="Planetary Kp"
              resource={kpSummary}
              loadingMessage="Loading the Kp trend..."
              isEmpty={(summary) => summary === null}
              emptyMessage="No Kp readings were stored in the last 24 hours."
            >
              {(summary) => summary && (
                <MiniTrendCard trend={summary} />
              )}
            </ResourceCard>

            <ResourceCard
              title="Solar wind speed"
              resource={solarWindSummary}
              loadingMessage="Loading the solar-wind trend..."
              isEmpty={(summary) => summary === null}
              emptyMessage="No solar-wind speed readings were stored in the last 24 hours."
            >
              {(summary) => summary && (
                <MiniTrendCard trend={summary} />
              )}
            </ResourceCard>
          </div>
        </PageSection>
      </div>
    </section>
  );
}

export default Dashboard;
