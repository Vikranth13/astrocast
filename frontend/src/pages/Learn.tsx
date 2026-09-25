import ConceptCard from "../components/learn/ConceptCard";

import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

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

      <div className="learn">
        <section className="learn-section">
          <SectionHeader
            title="Space weather"
            description="Activity on the Sun and what it does to Earth's magnetic field."
          />

          <div className="concept-grid">
            {SPACE_WEATHER_CONCEPTS.map(
              (concept) => (
                <ConceptCard
                  key={concept.name}
                  concept={concept}
                />
              )
            )}
          </div>
        </section>

        <section className="learn-section">
          <SectionHeader
            title="Observing conditions"
            description="What decides how much of the sky you can actually see."
          />

          <div className="concept-grid">
            {OBSERVING_CONCEPTS.map(
              (concept) => (
                <ConceptCard
                  key={concept.name}
                  concept={concept}
                />
              )
            )}
          </div>
        </section>

        <section className="learn-section">
          <SectionHeader
            title="Data sources and limitations"
            description="Where AstroCast's numbers come from, and what they cannot tell you."
          />

          <div className="concept-grid">
            {DATA_SOURCES.map((source) => (
              <Card
                key={source.name}
                className="source-card"
              >
                <h3>{source.name}</h3>

                <p>{source.provides}</p>
              </Card>
            ))}
          </div>

          <Card className="limitations-card">
            <h3>Limitations</h3>

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
        </section>
      </div>
    </section>
  );
}

export default Learn;
