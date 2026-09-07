import Card from "../ui/Card";

import type {
  ObservingStatus,
} from "../../data/mockDashboard";

import "./dashboard.css";

type ObservingStatusCardProps = {
  status: ObservingStatus;
};

function ObservingStatusCard({
  status,
}: ObservingStatusCardProps) {
  return (
    <Card className="dashboard-lead">
      <div className="dashboard-card-body">
        <span className="dashboard-card-title">
          Observing status
        </span>

        <div className="dashboard-score">
          <span className="dashboard-score-value">
            {status.score}
          </span>

          <span className="dashboard-score-total">
            / 100
          </span>

          <span className="dashboard-headline">
            {status.rating}
          </span>
        </div>

        <div className="dashboard-meter">
          <div
            className="dashboard-meter-fill"
            style={{
              width: `${status.score}%`,
            }}
          />
        </div>

        <p className="dashboard-note">
          {status.summary}
        </p>

        <p className="dashboard-note">
          Limiting factor:{" "}
          {status.limitingFactor}
        </p>
      </div>
    </Card>
  );
}

export default ObservingStatusCard;
