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

type AlertBadgesProps = {
  alert: Pick<
    SpaceWeatherAlert,
    "alert_type" | "severity" | "status"
  >;
};

function AlertBadges({
  alert,
}: AlertBadgesProps) {
  return (
    <div className="ui-badge-row">
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
  );
}

export default AlertBadges;
