import {
  useMemo,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import {
  listSpaceWeatherAlerts,
} from "../api/spaceWeatherApi";

import type {
  SpaceWeatherAlertListResponse,
} from "../api/types/spaceWeather";

import AlertFilters from "../components/alerts/AlertFilters";
import AlertListItem from "../components/alerts/AlertListItem";
import AlertPager from "../components/alerts/AlertPager";

import {
  ALERT_FILTER_PARAMS,
  ALERT_PAGE_PARAM,
  ALERT_PAGE_SIZE,
  hasActiveFilters,
  readAlertFilters,
  readAlertPage,
  type AlertFilterName,
} from "../components/alerts/alertFiltering";

import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingState from "../components/ui/LoadingState";
import PageSection from "../components/ui/PageSection";

import {
  useApiResource,
} from "../hooks/useApiResource";

import "../components/alerts/alerts.css";

type AlertResultsProps = {
  data: SpaceWeatherAlertListResponse;
  page: number;
  filtersActive: boolean;
  searchForPage: (page: number) => string;
};

function AlertResults({
  data,
  page,
  filtersActive,
  searchForPage,
}: AlertResultsProps) {
  if (data.total === 0) {
    return (
      <EmptyState
        message={
          filtersActive
            ? "No alerts match these filters."
            : "No NOAA alerts have been stored yet. Run alert ingestion to fetch them."
        }
      />
    );
  }

  const pageCount = Math.ceil(
    data.total / ALERT_PAGE_SIZE
  );

  // An old link, or a page that emptied as alerts expired, can point
  // past the end. Say so and offer the last real page.
  if (data.alerts.length === 0) {
    return (
      <div className="ui-stack">
        <EmptyState
          message={`Page ${page} is past the last page of results.`}
        />

        <Link
          className="back-link"
          to={{
            search: searchForPage(pageCount),
          }}
        >
          Go to page {pageCount}
        </Link>
      </div>
    );
  }

  const first = data.offset + 1;
  const last = data.offset + data.count;

  return (
    <div className="ui-stack">
      <p
        className="ui-caption"
        aria-live="polite"
      >
        Showing {first}–{last} of {data.total}{" "}
        {data.total === 1 ? "alert" : "alerts"}
      </p>

      <ul
        className="alert-list"
        aria-label="Alerts"
      >
        {data.alerts.map((alert) => (
          <AlertListItem
            key={alert.id}
            alert={alert}
          />
        ))}
      </ul>

      {pageCount > 1 && (
        <AlertPager
          page={page}
          pageCount={pageCount}
          searchForPage={searchForPage}
        />
      )}
    </div>
  );
}

function Alerts() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const filters = readAlertFilters(
    searchParams
  );

  const page = readAlertPage(
    searchParams
  );

  // The backend filters and pages. The page only forwards what the
  // address asks for.
  const loadAlerts = useMemo(
    () => () => listSpaceWeatherAlerts({
      severity: filters.severity,
      type: filters.type,
      status: filters.status,
      limit: ALERT_PAGE_SIZE,
      offset: (page - 1) * ALERT_PAGE_SIZE,
    }),
    [
      filters.severity,
      filters.type,
      filters.status,
      page,
    ]
  );

  const alerts = useApiResource(
    loadAlerts,
    [
      "alerts",
      filters.severity ?? "",
      filters.type ?? "",
      filters.status ?? "",
      page,
    ].join(":")
  );

  function searchForPage(
    targetPage: number
  ): string {
    const next = new URLSearchParams(
      searchParams
    );

    if (targetPage <= 1) {
      next.delete(ALERT_PAGE_PARAM);
    } else {
      next.set(
        ALERT_PAGE_PARAM,
        String(targetPage)
      );
    }

    const search = next.toString();

    return search ? `?${search}` : "";
  }

  // A new filter describes a different set of alerts, so it starts
  // again from the first page.
  function handleFilterChange(
    name: AlertFilterName,
    value: string
  ) {
    const next = new URLSearchParams(
      searchParams
    );

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    next.delete(ALERT_PAGE_PARAM);

    setSearchParams(next);
  }

  function handleClearFilters() {
    const next = new URLSearchParams(
      searchParams
    );

    for (const name of ALERT_FILTER_PARAMS) {
      next.delete(name);
    }

    next.delete(ALERT_PAGE_PARAM);

    setSearchParams(next);
  }

  return (
    <section className="page">
      <h1>Alerts</h1>

      <p className="page-intro">
        NOAA watches, warnings, and alerts, with severity, source,
        issue time, expiration, and a plain-language explanation.
      </p>

      <AlertFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      <PageSection
        title="NOAA notifications"
        description="Newest first. Status is judged against the stored expiry time."
      >
        {alerts.status === "loading" && (
          <LoadingState message="Loading NOAA alerts..." />
        )}

        {alerts.status === "error" && (
          <ErrorState message={alerts.message} />
        )}

        {alerts.status === "ready" && (
          <AlertResults
            data={alerts.data}
            page={page}
            filtersActive={hasActiveFilters(filters)}
            searchForPage={searchForPage}
          />
        )}
      </PageSection>
    </section>
  );
}

export default Alerts;
