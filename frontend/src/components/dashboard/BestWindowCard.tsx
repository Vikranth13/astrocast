import Card from "../ui/Card";

import type {
  BestWindow,
} from "../../data/mockDashboard";

import "./dashboard.css";

type BestWindowCardProps = {
  bestWindow: BestWindow;
};

function BestWindowCard({
  bestWindow,
}: BestWindowCardProps) {
  return (
    <Card>
      <div className="dashboard-card-body">
        <span className="dashboard-card-title">
          Best window
        </span>

        <span className="dashboard-headline">
          {bestWindow.startsAt} - {bestWindow.endsAt}
        </span>

        <p className="dashboard-note">
          {bestWindow.quality}
        </p>

        <p className="dashboard-note">
          {bestWindow.note}
        </p>
      </div>
    </Card>
  );
}

export default BestWindowCard;
