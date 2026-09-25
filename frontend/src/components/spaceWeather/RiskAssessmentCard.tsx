import Card from "../ui/Card";
import SeverityBadge from "../ui/SeverityBadge";

import {
  toneForRiskLevel,
} from "../ui/severity";

import type {
  SpaceWeatherRisk,
} from "../../data/mockSpaceWeather";

import {
  formatSource,
  formatUtc,
} from "../../utils/format";

import "./spaceWeather.css";

type RiskAssessmentCardProps = {
  assessment: SpaceWeatherRisk;
};

const FACTOR_LABELS: Record<string, string> = {
  planetary_k_index: "Planetary K-index",
  solar_wind_speed: "Solar wind speed",
  solar_wind_density: "Solar wind density",
};

const UNIT_LABELS: Record<string, string> = {
  "1/cm^3": "per cm³",
};

function RiskAssessmentCard({
  assessment,
}: RiskAssessmentCardProps) {
  const { risk } = assessment;

  return (
    <Card>
      <div className="risk-header">
        <span className="condition-label">
          AstroCast risk level
        </span>

        <SeverityBadge
          label={risk.level}
          tone={toneForRiskLevel(
            risk.level
          )}
        />
      </div>

      <ul className="risk-factors">
        {risk.contributing_factors.map(
          (factor) => (
            <li
              className="risk-factor"
              key={factor.rule_id}
            >
              <div className="risk-factor-head">
                <span className="risk-factor-name">
                  {FACTOR_LABELS[factor.factor]
                    ?? factor.factor}
                </span>

                <span className="risk-factor-value">
                  {factor.value}{" "}
                  {UNIT_LABELS[factor.unit]
                    ?? factor.unit}
                </span>
              </div>

              <p className="risk-factor-description">
                {factor.description}
              </p>

              <code className="risk-rule-id">
                {factor.rule_id}
              </code>
            </li>
          )
        )}
      </ul>

      <p className="risk-footnote">
        Assessed {formatUtc(assessment.assessed_at)}{" "}
        from {formatSource(assessment.source)} data
        by deterministic rules, not a forecast model.
      </p>
    </Card>
  );
}

export default RiskAssessmentCard;
