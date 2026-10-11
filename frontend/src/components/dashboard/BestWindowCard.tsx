import Card from "../ui/Card";

import type {
  BestWindow,
} from "../../data/mockDashboard";

type BestWindowCardProps = {
  bestWindow: BestWindow;
};

function BestWindowCard({
  bestWindow,
}: BestWindowCardProps) {
  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Best window
        </span>

        <span className="ui-headline">
          {bestWindow.startsAt} - {bestWindow.endsAt}
        </span>

        <p className="ui-muted">
          {bestWindow.quality}
        </p>

        <p className="ui-muted">
          {bestWindow.note}
        </p>
      </div>
    </Card>
  );
}

export default BestWindowCard;
