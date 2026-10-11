import {
  Link,
} from "react-router";

import AlertBadges from "./AlertBadges";

import Card from "../ui/Card";

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
      <Card className="ui-stack">
        <AlertBadges alert={alert} />

        <h3 className="ui-card-title">
          <Link
            className="ui-title-link"
            to={`/alerts/${alert.id}`}
          >
            {alert.summary}
          </Link>
        </h3>

        <dl className="alert-meta">
          <div>
            <dt className="ui-label">Issued</dt>

            <dd>
              {formatUtc(alert.issued_at)}
            </dd>
          </div>

          <div>
            <dt className="ui-label">Expires</dt>

            <dd>
              {alert.expires_at
                ? formatUtc(alert.expires_at)
                : "Not given"}
            </dd>
          </div>

          <div>
            <dt className="ui-label">Source</dt>

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
