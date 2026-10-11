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
      <article className="ui-stack">
        <div className="concept-header">
          <h3 className="ui-card-title">
            {concept.name}
          </h3>

          <SeverityBadge
            label={STATUS_LABELS[concept.status]}
            tone={STATUS_TONES[concept.status]}
          />
        </div>

        <p>{concept.definition}</p>

        <div className="concept-block">
          <span className="ui-label">
            Why it matters
          </span>

          <p className="ui-muted">
            {concept.whyItMatters}
          </p>
        </div>

        <div className="concept-block">
          <span className="ui-label">
            In AstroCast
          </span>

          <p className="ui-muted">
            {concept.inAstroCast}
          </p>
        </div>
      </article>
    </Card>
  );
}

export default ConceptCard;
