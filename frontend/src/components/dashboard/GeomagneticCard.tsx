import Card from "../ui/Card";
import DataFreshness from "../ui/DataFreshness";
import SeverityBadge from "../ui/SeverityBadge";

import {
  toneForActivityLevel,
  toneForNoaaScale,
  toneForRiskLevel,
} from "../ui/severity";

import type {
  GeomagneticSnapshot,
} from "../../data/mockDashboard";

type GeomagneticCardProps = {
  snapshot: GeomagneticSnapshot;
};

function GeomagneticCard({
  snapshot,
}: GeomagneticCardProps) {
  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Geomagnetic activity
        </span>

        <span className="ui-headline">
          Kp {snapshot.kp.toFixed(2)}
        </span>

        <div className="ui-badge-row">
          <SeverityBadge
            label={snapshot.activityLabel}
            tone={toneForActivityLevel(
              snapshot.activityLevel
            )}
          />

          {snapshot.noaaScale && (
            <SeverityBadge
              label={snapshot.noaaScale}
              tone={toneForNoaaScale(
                snapshot.noaaScale
              )}
            />
          )}

          <SeverityBadge
            label={`${snapshot.riskLevel} risk`}
            tone={toneForRiskLevel(
              snapshot.riskLevel
            )}
          />
        </div>

        <DataFreshness
          status={snapshot.freshnessStatus}
          ageMinutes={
            snapshot.freshnessAgeMinutes
          }
        />
      </div>
    </Card>
  );
}

export default GeomagneticCard;
