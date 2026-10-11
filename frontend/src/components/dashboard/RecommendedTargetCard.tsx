import Card from "../ui/Card";

import type {
  RecommendedTarget,
} from "../../data/mockDashboard";

type RecommendedTargetCardProps = {
  target: RecommendedTarget;
};

function RecommendedTargetCard({
  target,
}: RecommendedTargetCardProps) {
  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Recommended target
        </span>

        <span className="ui-headline">
          {target.name}
        </span>

        <div className="ui-row">
          <span className="ui-muted">
            {target.kind}
          </span>

          <span>
            {target.altitudeDegrees}° at{" "}
            {target.bestAt}
          </span>
        </div>

        <p className="ui-muted">
          {target.reason}
        </p>
      </div>
    </Card>
  );
}

export default RecommendedTargetCard;
