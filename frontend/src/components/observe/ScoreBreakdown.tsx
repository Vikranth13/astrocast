import SeverityBadge from "../ui/SeverityBadge";

import type {
  Tone,
} from "../ui/severity";

import type {
  ScoreFactor,
} from "../../data/mockObserveTonight";

import "./observe.css";

type ScoreBreakdownProps = {
  factors: ScoreFactor[];
};

const HEAVY_PENALTY = 20;
const NOTICEABLE_PENALTY = 10;

function toneForPenalty(
  penalty: number
): Tone {
  if (penalty >= HEAVY_PENALTY) {
    return "warning";
  }

  if (penalty >= NOTICEABLE_PENALTY) {
    return "caution";
  }

  return "quiet";
}

function ScoreBreakdown({
  factors,
}: ScoreBreakdownProps) {
  const largestPenalty = Math.max(
    ...factors.map(
      (factor) => factor.penalty
    )
  );

  return (
    <div className="breakdown">
      {factors.map((factor) => (
        <div
          className="breakdown-row"
          key={factor.factor}
        >
          <div className="breakdown-head">
            <span className="breakdown-name">
              {factor.factor}

              {factor.isLimiting && (
                <SeverityBadge
                  label="Limiting factor"
                  tone={toneForPenalty(
                    factor.penalty
                  )}
                />
              )}
            </span>

            <span className="breakdown-value">
              {factor.value}, costs{" "}
              {factor.penalty} points
            </span>
          </div>

          <div className="breakdown-meter">
            <div
              className="breakdown-meter-fill"
              style={{
                width: `${
                  (factor.penalty /
                    largestPenalty) *
                  100
                }%`,
              }}
            />
          </div>

          <p className="breakdown-note">
            {factor.note}
          </p>
        </div>
      ))}
    </div>
  );
}

export default ScoreBreakdown;
