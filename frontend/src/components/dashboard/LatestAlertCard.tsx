import {
  Link,
} from "react-router";

import AlertBadges from "../alerts/AlertBadges";

import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";

import type {
  SpaceWeatherAlert,
} from "../../data/mockSpaceWeather";

import {
  formatUtc,
} from "../../utils/format";

type LatestAlertCardProps = {
  alert: SpaceWeatherAlert | null;
};

function LatestAlertCard({
  alert,
}: LatestAlertCardProps) {
  if (!alert) {
    return (
      <Card>
        <div className="ui-stack">
          <span className="ui-eyebrow">
            Latest alert
          </span>

          <EmptyState
            message="No NOAA alerts have been stored yet."
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Latest alert
        </span>

        <AlertBadges alert={alert} />

        <h3 className="ui-card-title">
          <Link
            className="ui-title-link"
            to={`/alerts/${alert.id}`}
          >
            {alert.summary}
          </Link>
        </h3>

        <p className="ui-caption">
          Issued {formatUtc(alert.issued_at)}
        </p>
      </div>
    </Card>
  );
}

export default LatestAlertCard;
