import BestWindowCard from "../components/dashboard/BestWindowCard";
import GeomagneticCard from "../components/dashboard/GeomagneticCard";
import LatestAlertCard from "../components/dashboard/LatestAlertCard";
import MiniTrendCard from "../components/dashboard/MiniTrendCard";
import MoonCard from "../components/dashboard/MoonCard";
import ObservingStatusCard from "../components/dashboard/ObservingStatusCard";
import RecommendedTargetCard from "../components/dashboard/RecommendedTargetCard";

import PageSection from "../components/ui/PageSection";

import {
  MOCK_DASHBOARD,
} from "../data/mockDashboard";

function Dashboard() {
  return (
    <section className="page">
      <h1>Dashboard</h1>

      <p className="page-intro">
        Tonight at a glance: observing status, the best window,
        the Moon, geomagnetic risk, the latest alert, and mini trends.
      </p>

      <div className="page-sections">
        <PageSection
          title="Tonight"
          description="Whether it is worth going out, and when."
        >
          <div className="ui-grid">
            <ObservingStatusCard
              status={MOCK_DASHBOARD.observing}
            />

            <BestWindowCard
              bestWindow={MOCK_DASHBOARD.bestWindow}
            />

            <div className="ui-span-all">
              <RecommendedTargetCard
                target={
                  MOCK_DASHBOARD.recommendedTarget
                }
              />
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Sky and space weather"
          description="Global geomagnetic conditions, not a local aurora forecast."
        >
          <div className="ui-grid">
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
        </PageSection>

        <PageSection
          title="Recent movement"
          description="The last 24 hours of stored observations."
        >
          <div className="ui-grid">
            {MOCK_DASHBOARD.trends.map(
              (trend) => (
                <MiniTrendCard
                  key={trend.metric}
                  trend={trend}
                />
              )
            )}
          </div>
        </PageSection>
      </div>
    </section>
  );
}

export default Dashboard;
