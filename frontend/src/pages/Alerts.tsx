import {
  useSearchParams,
} from "react-router";

import AlertFilters from "../components/alerts/AlertFilters";
import AlertListItem from "../components/alerts/AlertListItem";

import {
  ALERT_FILTER_PARAMS,
  filterAlerts,
  readAlertFilters,
  type AlertFilterName,
} from "../components/alerts/alertFiltering";

import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";

import {
  MOCK_ALERTS,
} from "../data/mockSpaceWeather";

import "../components/alerts/alerts.css";

function Alerts() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const filters = readAlertFilters(
    searchParams
  );

  const visibleAlerts = filterAlerts(
    MOCK_ALERTS,
    filters
  );

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

    setSearchParams(next);
  }

  function handleClearFilters() {
    const next = new URLSearchParams(
      searchParams
    );

    for (const name of ALERT_FILTER_PARAMS) {
      next.delete(name);
    }

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

      <section className="alerts-section">
        <SectionHeader
          title="NOAA notifications"
          description="Newest first. Status is judged against the stored expiry time."
        />

        <p
          className="alert-count"
          aria-live="polite"
        >
          Showing {visibleAlerts.length} of{" "}
          {MOCK_ALERTS.length} alerts
        </p>

        {visibleAlerts.length === 0 ? (
          <EmptyState
            message="No alerts match these filters."
          />
        ) : (
          <ul
            className="alert-list"
            aria-label="Alerts"
          >
            {visibleAlerts.map((alert) => (
              <AlertListItem
                key={alert.id}
                alert={alert}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default Alerts;
