import ConceptCard from "../components/learn/ConceptCard";

import Card from "../components/ui/Card";
import PageSection from "../components/ui/PageSection";

import {
  DATA_SOURCES,
  LIMITATIONS,
  OBSERVING_CONCEPTS,
  SPACE_WEATHER_CONCEPTS,
} from "../data/concepts";

import "../components/learn/learn.css";

function Learn() {
  return (
    <section className="page">
      <h1>Learn</h1>

      <p className="page-intro">
        What the terms on AstroCast mean, why they matter when you
        observe, and how much AstroCast can actually tell you about
        each one.
      </p>

      <div className="page-sections">
        <PageSection
          title="Space weather"
          description="Activity on the Sun and what it does to Earth's magnetic field."
        >
          <div className="ui-grid ui-grid-wide">
            {SPACE_WEATHER_CONCEPTS.map(
              (concept) => (
                <ConceptCard
                  key={concept.name}
                  concept={concept}
                />
              )
            )}
          </div>
        </PageSection>

        <PageSection
          title="Observing conditions"
          description="What decides how much of the sky you can actually see."
        >
          <div className="ui-grid ui-grid-wide">
            {OBSERVING_CONCEPTS.map(
              (concept) => (
                <ConceptCard
                  key={concept.name}
                  concept={concept}
                />
              )
            )}
          </div>
        </PageSection>

        <PageSection
          title="Data sources and limitations"
          description="Where AstroCast's numbers come from, and what they cannot tell you."
        >
          <div className="ui-grid ui-grid-wide">
            {DATA_SOURCES.map((source) => (
              <Card
                key={source.name}
                className="ui-stack"
              >
                <h3 className="ui-card-title">
                  {source.name}
                </h3>

                <p className="ui-muted">
                  {source.provides}
                </p>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="ui-card-title">
              Limitations
            </h3>

            <ul className="limitations">
              {LIMITATIONS.map(
                (limitation) => (
                  <li key={limitation}>
                    {limitation}
                  </li>
                )
              )}
            </ul>
          </Card>
        </PageSection>
      </div>
    </section>
  );
}

export default Learn;
