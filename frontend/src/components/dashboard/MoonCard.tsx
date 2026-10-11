import Card from "../ui/Card";

import type {
  MoonSnapshot,
} from "../../data/mockDashboard";

type MoonCardProps = {
  moon: MoonSnapshot;
};

function MoonCard({
  moon,
}: MoonCardProps) {
  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Moon
        </span>

        <span className="ui-headline">
          {moon.phase}
        </span>

        <div className="ui-row">
          <span className="ui-muted">
            Illumination
          </span>

          <span>
            {moon.illuminationPercent}%
          </span>
        </div>

        <div className="ui-row">
          <span className="ui-muted">
            Sets
          </span>

          <span>{moon.setsAt}</span>
        </div>

        <p className="ui-muted">
          {moon.interference}
        </p>
      </div>
    </Card>
  );
}

export default MoonCard;
