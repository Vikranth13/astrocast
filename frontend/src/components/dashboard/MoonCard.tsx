import Card from "../ui/Card";

import type {
  MoonSnapshot,
} from "../../data/mockDashboard";

import "./dashboard.css";

type MoonCardProps = {
  moon: MoonSnapshot;
};

function MoonCard({
  moon,
}: MoonCardProps) {
  return (
    <Card>
      <div className="dashboard-card-body">
        <span className="dashboard-card-title">
          Moon
        </span>

        <span className="dashboard-headline">
          {moon.phase}
        </span>

        <div className="dashboard-row">
          <span className="dashboard-note">
            Illumination
          </span>

          <span>
            {moon.illuminationPercent}%
          </span>
        </div>

        <div className="dashboard-row">
          <span className="dashboard-note">
            Sets
          </span>

          <span>{moon.setsAt}</span>
        </div>

        <p className="dashboard-note">
          {moon.interference}
        </p>
      </div>
    </Card>
  );
}

export default MoonCard;
