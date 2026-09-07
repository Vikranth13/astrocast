import Card from "../ui/Card";

import type {
  RecommendedTarget,
} from "../../data/mockDashboard";

import "./dashboard.css";

type RecommendedTargetCardProps = {
  target: RecommendedTarget;
};

function RecommendedTargetCard({
  target,
}: RecommendedTargetCardProps) {
  return (
    <Card>
      <div className="dashboard-card-body">
        <span className="dashboard-card-title">
          Recommended target
        </span>

        <span className="dashboard-headline">
          {target.name}
        </span>

        <div className="dashboard-row">
          <span className="dashboard-note">
            {target.kind}
          </span>

          <span>
            {target.altitudeDegrees}° at{" "}
            {target.bestAt}
          </span>
        </div>

        <p className="dashboard-note">
          {target.reason}
        </p>
      </div>
    </Card>
  );
}

export default RecommendedTargetCard;
