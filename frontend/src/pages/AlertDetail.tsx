import {
  useMemo,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  getSpaceWeatherAlert,
} from "../api/spaceWeatherApi";

import type {
  SpaceWeatherAlertDetailResponse,
} from "../api/types/spaceWeather";

import AlertBadges from "../components/alerts/AlertBadges";

import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  severityFamilyLabel,
} from "../components/alerts/alertFiltering";

import ExplanationPanel from "../components/spaceWeather/ExplanationPanel";

import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingState from "../components/ui/LoadingState";
import PageSection from "../components/ui/PageSection";

import {
  useApiResource,
} from "../hooks/useApiResource";

import {
  formatSource,
  formatUtc,
} from "../utils/format";

import "../components/alerts/alerts.css";

function BackToAlerts() {
  return (
    <Link
      to="/alerts"
      className="back-link"
    >
      <span aria-hidden="true">←</span>{" "}
      All alerts
    </Link>
  );
}

function AlertNotFound({
  alertId,
}: {
  alertId: string | undefined;
}) {
  return (
    <section className="page">
      <BackToAlerts />

      <h1>Alert not found</h1>

      <EmptyState
        message={`There is no stored alert with ID ${alertId}.`}
      />
    </section>
  );
}

// Alert ids are positive whole numbers. Anything else cannot exist, so it
// is reported as not found without asking the backend.
function parseAlertId(
  alertId: string | undefined
): number | null {
  if (alertId === undefined || !/^\d+$/.test(alertId)) {
    return null;
  }

  const id = Number(alertId);

  return id > 0 ? id : null;
}

function AlertContent({
  alert,
}: {
  alert: SpaceWeatherAlertDetailResponse;
}) {
  const family = severityFamilyLabel(
    alert.severity
  );

  return (
    <section className="page">
      <BackToAlerts />

      <AlertBadges alert={alert} />

      <h1>{alert.summary}</h1>

      {/* The status comes from the backend, judged against the stored
          expiry time when the page was requested. */}
      {alert.status === "expired" && alert.expires_at && (
        <Card className="alert-expired-notice">
          <p role="note">
            This alert expired on {formatUtc(alert.expires_at)}. It
            describes conditions that no longer apply.
          </p>
        </Card>
      )}

      <Card>
        <dl className="alert-meta">
          <div>
            <dt className="ui-label">Source</dt>
            <dd>{formatSource(alert.source)}</dd>
          </div>

          <div>
            <dt className="ui-label">Type</dt>
            <dd>{ALERT_TYPE_LABELS[alert.alert_type]}</dd>
          </div>

          <div>
            <dt className="ui-label">Severity</dt>
            <dd>
              {alert.severity
                ? `${alert.severity}, ${family}`
                : "None given"}
            </dd>
          </div>

          <div>
            <dt className="ui-label">Status</dt>
            <dd>
              {alert.status === "unknown"
                ? "Unknown"
                : ALERT_STATUS_LABELS[alert.status]}
            </dd>
          </div>

          <div>
            <dt className="ui-label">Issued</dt>
            <dd>{formatUtc(alert.issued_at)}</dd>
          </div>

          <div>
            <dt className="ui-label">
              {alert.status === "expired"
                ? "Expired"
                : "Expires"}
            </dt>
            <dd>
              {alert.expires_at
                ? formatUtc(alert.expires_at)
                : "Not given"}
            </dd>
          </div>

          <div>
            <dt className="ui-label">NOAA product</dt>
            <dd>{alert.external_id ?? "Not given"}</dd>
          </div>

          <div>
            <dt className="ui-label">Stored</dt>
            <dd>{formatUtc(alert.ingested_at)}</dd>
          </div>
        </dl>
      </Card>

      <PageSection
        title="What this means"
      >
        <ExplanationPanel
          explanation={alert.explanation}
        />
      </PageSection>
    </section>
  );
}

function AlertDetail() {
  const { alertId } = useParams();

  const id = parseAlertId(alertId);

  const loadAlert = useMemo(
    () => (
      id === null
        ? null
        : () => getSpaceWeatherAlert(id)
    ),
    [id]
  );

  const alert = useApiResource(
    loadAlert,
    `alert:${id}`
  );

  if (
    id === null
    || (
      alert.status === "error"
      && alert.code === "not_found"
    )
  ) {
    return <AlertNotFound alertId={alertId} />;
  }

  if (alert.status === "ready") {
    return <AlertContent alert={alert.data} />;
  }

  return (
    <section className="page">
      <BackToAlerts />

      <h1>Alert {alertId}</h1>

      {alert.status === "error" ? (
        <ErrorState message={alert.message} />
      ) : (
        <LoadingState message="Loading the alert..." />
      )}
    </section>
  );
}

export default AlertDetail;
