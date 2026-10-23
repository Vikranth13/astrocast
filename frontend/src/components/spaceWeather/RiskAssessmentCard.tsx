import Card from "../ui/Card";
import SeverityBadge from "../ui/SeverityBadge";

import {
  toneForRiskLevel,
} from "../ui/severity";

import type {
  CurrentSpaceWeatherRiskResponse,
} from "../../api/types/spaceWeather";

import {
  formatSource,
  formatUtc,
} from "../../utils/format";

import {
  MEASUREMENTS,
  formatMeasurementWithUnit,
  measurementForFactor,
} from "../../utils/measurements";

import "./spaceWeather.css";

type RiskAssessmentCardProps = {
  assessment: CurrentSpaceWeatherRiskResponse;
};

// Known factors are written the same way as everywhere else in the app.
// A factor the frontend does not know yet is shown as the backend sent it.
function describeFactor(
  factor: string,
  value: number,
  unit: string
): { label: string; reading: string } {
  const kind = measurementForFactor(factor);

  if (kind === null) {
    return {
      label: factor,
      reading: `${value} ${unit}`,
    };
  }

  return {
    label: MEASUREMENTS[kind].label,
    reading: formatMeasurementWithUnit(kind, value),
  };
}

function RiskAssessmentCard({
  assessment,
}: RiskAssessmentCardProps) {
  const { risk } = assessment;

  return (
    <Card>
      <div className="ui-row">
        <span className="ui-eyebrow">
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
          (factor) => {
            const { label, reading } = describeFactor(
              factor.factor,
              factor.value,
              factor.unit
            );

            return (
              <li
                className="risk-factor"
                key={factor.rule_id}
              >
                <div className="ui-row">
                  <span className="risk-factor-name">
                    {label}
                  </span>

                  <span className="risk-factor-value">
                    {reading}
                  </span>
                </div>

                <p className="ui-muted">
                  {factor.description}
                </p>

                <code className="risk-rule-id">
                  {factor.rule_id}
                </code>
              </li>
            );
          }
        )}
      </ul>

      <p className="ui-caption risk-footnote">
        Assessed {formatUtc(assessment.assessed_at)}{" "}
        from {formatSource(assessment.source)} data
        by deterministic rules, not a forecast model.
      </p>
    </Card>
  );
}

export default RiskAssessmentCard;
