import ScoreReadout from "../observe/ScoreReadout";

import Card from "../ui/Card";
import Meter from "../ui/Meter";

import type {
  ObservingStatus,
} from "../../data/mockDashboard";

type ObservingStatusCardProps = {
  status: ObservingStatus;
};

function ObservingStatusCard({
  status,
}: ObservingStatusCardProps) {
  return (
    <Card className="ui-span-2">
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Observing status
        </span>

        <ScoreReadout
          score={status.score}
          rating={status.rating}
        />

        <Meter percent={status.score} />

        <p className="ui-muted">
          {status.summary}
        </p>

        <p className="ui-muted">
          Limiting factor:{" "}
          {status.limitingFactor}
        </p>
      </div>
    </Card>
  );
}

export default ObservingStatusCard;
