import Card from "../ui/Card";
import DataFreshness from "../ui/DataFreshness";
import SeverityBadge from "../ui/SeverityBadge";

import {
  toneForActivityLevel,
  toneForNoaaScale,
  toneForRiskLevel,
} from "../ui/severity";

import type {
  CurrentSpaceWeatherResponse,
  CurrentSpaceWeatherRiskResponse,
} from "../../api/types/spaceWeather";

import type {
  ApiResource,
} from "../../hooks/useApiResource";

import {
  formatUtc,
} from "../../utils/format";

type GeomagneticCardProps = {
  current: CurrentSpaceWeatherResponse;
  // The risk assessment is a separate request. It is shown when it
  // arrives, and its failure leaves the rest of the card in place.
  risk: ApiResource<CurrentSpaceWeatherRiskResponse>;
};

function GeomagneticCard({
  current,
  risk,
}: GeomagneticCardProps) {
  const activity = current.geomagnetic_activity;

  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          Geomagnetic activity
        </span>

        <span className="ui-headline">
          Kp {current.facts.kp.toFixed(2)}
        </span>

        <div className="ui-badge-row">
          <SeverityBadge
            label={activity.label}
            tone={toneForActivityLevel(
              activity.level
            )}
          />

          {activity.noaa_scale && (
            <SeverityBadge
              label={activity.noaa_scale}
              tone={toneForNoaaScale(
                activity.noaa_scale
              )}
            />
          )}

          {risk.status === "ready" && (
            <SeverityBadge
              label={`${risk.data.risk.level} risk`}
              tone={toneForRiskLevel(
                risk.data.risk.level
              )}
            />
          )}
        </div>

        {risk.status === "error" && (
          <p className="ui-caption">
            Risk assessment unavailable: {risk.message}
          </p>
        )}

        <DataFreshness
          status={current.freshness.status}
          ageMinutes={
            current.freshness.age_minutes
          }
        />

        <p className="ui-caption">
          Observed {formatUtc(current.observed_at)}
        </p>
      </div>
    </Card>
  );
}

export default GeomagneticCard;
