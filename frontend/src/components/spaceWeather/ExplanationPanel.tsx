import Card from "../ui/Card";

import type {
  SpaceWeatherExplanation,
} from "../../data/mockSpaceWeather";

import "./spaceWeather.css";

type ExplanationPanelProps = {
  explanation: SpaceWeatherExplanation;
};

const CAVEATS_TITLE = "Limits of this data";

function ExplanationPanel({
  explanation,
}: ExplanationPanelProps) {
  return (
    <Card className="explanation">
      <p className="explanation-summary">
        {explanation.summary}
      </p>

      {explanation.details.length > 0 && (
        <ul className="explanation-details">
          {explanation.details.map(
            (detail) => (
              <li key={detail}>
                {detail}
              </li>
            )
          )}
        </ul>
      )}

      {explanation.caveats.length > 0 && (
        <div
          className="explanation-caveats"
          role="note"
          aria-label={CAVEATS_TITLE}
        >
          <h3 className="explanation-caveats-title">
            {CAVEATS_TITLE}
          </h3>

          <ul>
            {explanation.caveats.map(
              (caveat) => (
                <li key={caveat}>
                  {caveat}
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default ExplanationPanel;
