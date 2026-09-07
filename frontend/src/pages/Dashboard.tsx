import BestWindowCard from "../components/dashboard/BestWindowCard";
import GeomagneticCard from "../components/dashboard/GeomagneticCard";
import LatestAlertCard from "../components/dashboard/LatestAlertCard";
import MiniTrendCard from "../components/dashboard/MiniTrendCard";
import MoonCard from "../components/dashboard/MoonCard";
import ObservingStatusCard from "../components/dashboard/ObservingStatusCard";
import RecommendedTargetCard from "../components/dashboard/RecommendedTargetCard";

import SectionHeader from "../components/ui/SectionHeader";

import {
  MOCK_DASHBOARD,
} from "../data/mockDashboard";

import "../components/dashboard/dashboard.css";

function Dashboard() {
  return (
    <section className="page">
      <h1>Dashboard</h1>

      <p className="page-intro">
        Tonight at a glance: observing status, the best window,
        the Moon, geomagnetic risk, the latest alert, and mini trends.
      </p>

      <div className="dashboard">
        <section className="dashboard-section">
          <SectionHeader
            title="Tonight"
            description="Whether it is worth going out, and when."
          />

          <div className="dashboard-grid">
            <ObservingStatusCard
              status={MOCK_DASHBOARD.observing}
            />

            <BestWindowCard
              bestWindow={MOCK_DASHBOARD.bestWindow}
            />

            <div className="dashboard-wide">
              <RecommendedTargetCard
                target={
                  MOCK_DASHBOARD.recommendedTarget
                }
              />
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <SectionHeader
            title="Sky and space weather"
            description="Global geomagnetic conditions, not a local aurora forecast."
          />

          <div className="dashboard-grid">
            <MoonCard
              moon={MOCK_DASHBOARD.moon}
            />

            <GeomagneticCard
              snapshot={
                MOCK_DASHBOARD.geomagnetic
              }
            />

            <LatestAlertCard
              alert={
                MOCK_DASHBOARD.latestAlert
              }
            />
          </div>
        </section>

        <section className="dashboard-section">
          <SectionHeader
            title="Recent movement"
            description="The last 24 hours of stored observations."
          />

          <div className="dashboard-grid">
            {MOCK_DASHBOARD.trends.map(
              (trend) => (
                <MiniTrendCard
                  key={trend.metric}
                  trend={trend}
                />
              )
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export default Dashboard;
