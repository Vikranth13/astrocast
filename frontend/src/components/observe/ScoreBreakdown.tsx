import Meter from "../ui/Meter";
import SeverityBadge from "../ui/SeverityBadge";

import type {
  Tone,
} from "../ui/severity";

import type {
  ScoreFactor,
} from "../../api/types/observe";

import {
  formatMeasurement,
} from "../../utils/format";

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

function describePenalty(
  penalty: number
): string {
  return penalty === 0
    ? "no penalty"
    : `costs ${penalty} points`;
}

function ScoreBreakdown({
  factors,
}: ScoreBreakdownProps) {
  const largestPenalty = Math.max(
    0,
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
          <div className="ui-row">
            <span className="breakdown-name">
              {factor.label}

              {factor.is_limiting && (
                <SeverityBadge
                  label="Limiting factor"
                  tone={toneForPenalty(
                    factor.penalty
                  )}
                />
              )}
            </span>

            <span className="ui-caption">
              {formatMeasurement(
                factor.value,
                factor.unit
              )}
              , {describePenalty(factor.penalty)}
            </span>
          </div>

          {/* Bars are relative to the costliest factor. On a night with
              no penalties at all, every bar is empty. */}
          <Meter
            percent={
              largestPenalty === 0
                ? 0
                : (factor.penalty / largestPenalty)
                  * 100
            }
            tone="caution"
          />

          <p className="ui-caption">
            {factor.note}
          </p>
        </div>
      ))}
    </div>
  );
}

export default ScoreBreakdown;
