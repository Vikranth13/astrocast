import {
  Link,
} from "react-router";

import Card from "../ui/Card";
import SeverityBadge from "../ui/SeverityBadge";

import {
  toneForAlertStatus,
  toneForNoaaScale,
} from "../ui/severity";

import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
} from "./alertFiltering";

import type {
  SpaceWeatherAlert,
} from "../../data/mockSpaceWeather";

import {
  formatSource,
  formatUtc,
} from "../../utils/format";

import "./alerts.css";

type AlertListItemProps = {
  alert: SpaceWeatherAlert;
};

function AlertListItem({
  alert,
}: AlertListItemProps) {
  return (
    <li>
      <Card className="alert-item">
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

        <h3 className="alert-title">
          <Link to={`/alerts/${alert.id}`}>
            {alert.summary}
          </Link>
        </h3>

        <dl className="alert-meta">
          <div>
            <dt>Issued</dt>

            <dd>
              {formatUtc(alert.issued_at)}
            </dd>
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
            <dt>Source</dt>

            <dd>
              {formatSource(alert.source)}
            </dd>
          </div>
        </dl>
      </Card>
    </li>
  );
}

export default AlertListItem;
