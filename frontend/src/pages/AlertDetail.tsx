import {
  Link,
  useParams,
} from "react-router";

import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  severityFamilyLabel,
} from "../components/alerts/alertFiltering";

import ExplanationPanel from "../components/spaceWeather/ExplanationPanel";

import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import SeverityBadge from "../components/ui/SeverityBadge";

import {
  toneForAlertStatus,
  toneForNoaaScale,
} from "../components/ui/severity";

import {
  MOCK_ALERTS,
} from "../data/mockSpaceWeather";

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

function AlertDetail() {
  const { alertId } = useParams();

  const alert = MOCK_ALERTS.find(
    (candidate) =>
      String(candidate.id) === alertId
  );

  if (!alert) {
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

  const family = severityFamilyLabel(
    alert.severity
  );

  return (
    <section className="page">
      <BackToAlerts />

      <div className="alert-badges">
        <SeverityBadge
          label={
            ALERT_TYPE_LABELS[alert.alert_type]
          }
        />

        {alert.severity && (
          <SeverityBadge
            label={alert.severity}
            tone={toneForNoaaScale(
              alert.severity
            )}
          />
        )}

        <SeverityBadge
          label={
            ALERT_STATUS_LABELS[alert.status]
          }
          tone={toneForAlertStatus(
            alert.status
          )}
        />
      </div>

      <h1>{alert.summary}</h1>

      <Card>
        <dl className="alert-meta">
          <div>
            <dt>Source</dt>
            <dd>{formatSource(alert.source)}</dd>
          </div>

          <div>
            <dt>Type</dt>
            <dd>{ALERT_TYPE_LABELS[alert.alert_type]}</dd>
          </div>

          <div>
            <dt>Severity</dt>
            <dd>
              {alert.severity
                ? `${alert.severity}, ${family}`
                : "None given"}
            </dd>
          </div>

          <div>
            <dt>Status</dt>
            <dd>
              {alert.status === "unknown"
                ? "Unknown"
                : ALERT_STATUS_LABELS[alert.status]}
            </dd>
          </div>

          <div>
            <dt>Issued</dt>
            <dd>{formatUtc(alert.issued_at)}</dd>
          </div>

          <div>
            <dt>Expires</dt>
            <dd>
              {alert.expires_at
                ? formatUtc(alert.expires_at)
                : "Not given"}
            </dd>
          </div>

          <div>
            <dt>NOAA product</dt>
            <dd>{alert.external_id ?? "Not given"}</dd>
          </div>

          <div>
            <dt>Stored</dt>
            <dd>{formatUtc(alert.ingested_at)}</dd>
          </div>
        </dl>
      </Card>

      <section className="alert-detail-section">
        <SectionHeader
          title="What this means"
        />

        <ExplanationPanel
          explanation={alert.explanation}
        />
      </section>
    </section>
  );
}

export default AlertDetail;
