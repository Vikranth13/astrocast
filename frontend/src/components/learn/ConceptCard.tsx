import Card from "../ui/Card";
import SeverityBadge from "../ui/SeverityBadge";

import type {
  Tone,
} from "../ui/severity";

import type {
  Concept,
  ConceptStatus,
} from "../../data/concepts";

import "./learn.css";

type ConceptCardProps = {
  concept: Concept;
};

const STATUS_LABELS: Record<ConceptStatus, string> = {
  measured: "Measured",
  via_alerts: "Via NOAA alerts",
  approximated: "Estimated",
  planned: "Planned",
  not_measured: "Not measured",
  not_forecast: "Not forecast",
};

const STATUS_TONES: Record<ConceptStatus, Tone> = {
  measured: "info",
  via_alerts: "info",
  approximated: "caution",
  planned: "quiet",
  not_measured: "quiet",
  not_forecast: "quiet",
};

function ConceptCard({
  concept,
}: ConceptCardProps) {
  return (
    <Card>
      <article className="concept">
        <div className="concept-header">
          <h3>{concept.name}</h3>

          <SeverityBadge
            label={STATUS_LABELS[concept.status]}
            tone={STATUS_TONES[concept.status]}
          />
        </div>

        <p className="concept-definition">
          {concept.definition}
        </p>

        <div className="concept-block">
          <span className="concept-label">
            Why it matters
          </span>

          <p>{concept.whyItMatters}</p>
        </div>

        <div className="concept-block">
          <span className="concept-label">
            In AstroCast
          </span>

          <p>{concept.inAstroCast}</p>
        </div>
      </article>
    </Card>
  );
}

export default ConceptCard;
