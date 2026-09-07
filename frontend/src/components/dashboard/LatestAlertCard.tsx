import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import SeverityBadge from "../ui/SeverityBadge";

import {
  toneForAlertStatus,
  toneForNoaaScale,
} from "../ui/severity";

import type {
  LatestAlert,
} from "../../data/mockDashboard";

import "./dashboard.css";

type LatestAlertCardProps = {
  alert: LatestAlert | null;
};

function LatestAlertCard({
  alert,
}: LatestAlertCardProps) {
  if (!alert) {
    return (
      <Card>
        <div className="dashboard-card-body">
          <span className="dashboard-card-title">
            Latest alert
          </span>

          <EmptyState
            message="No active NOAA alerts."
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="dashboard-card-body">
        <span className="dashboard-card-title">
          Latest alert
        </span>

        <span className="dashboard-headline">
          {alert.alertType}
        </span>

        <div className="dashboard-badges">
          {alert.severity && (
            <SeverityBadge
              label={alert.severity}
              tone={toneForNoaaScale(
                alert.severity
              )}
            />
          )}

          <SeverityBadge
            label={alert.status}
            tone={toneForAlertStatus(
              alert.status
            )}
          />
        </div>

        <p className="dashboard-note">
          {alert.summary}
        </p>

        <p className="dashboard-note">
          Issued {alert.issuedAt}
        </p>
      </div>
    </Card>
  );
}

export default LatestAlertCard;
