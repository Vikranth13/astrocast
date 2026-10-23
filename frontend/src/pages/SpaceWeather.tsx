import {
  getCurrentSpaceWeather,
  getCurrentSpaceWeatherRisk,
} from "../api/spaceWeatherApi";

import SourceState from "../components/SourceState";

import ExplanationPanel from "../components/spaceWeather/ExplanationPanel";
import RiskAssessmentCard from "../components/spaceWeather/RiskAssessmentCard";

import Card from "../components/ui/Card";
import DataFreshness from "../components/ui/DataFreshness";
import MetricCard from "../components/ui/MetricCard";
import PageSection from "../components/ui/PageSection";
import SeverityBadge from "../components/ui/SeverityBadge";

import {
  toneForNoaaScale,
} from "../components/ui/severity";

import {
  useApiResource,
} from "../hooks/useApiResource";

import {
  formatSource,
  formatUtc,
} from "../utils/format";

import {
  MEASUREMENTS,
  formatMeasurementValue,
} from "../utils/measurements";

function observedFootnote(
  observedAt: string | null
): string | undefined {
  return observedAt
    ? `Observed ${formatUtc(observedAt)}`
    : undefined;
}

function SpaceWeather() {
  // Current conditions and the risk assessment are separate requests,
  // so a failed risk assessment leaves the Kp reading on the page.
  const current = useApiResource(getCurrentSpaceWeather);
  const risk = useApiResource(getCurrentSpaceWeatherRisk);

  return (
    <section className="page">
      <h1>Space Weather</h1>

      <p className="page-intro">
        Current geomagnetic conditions from NOAA SWPC, shown with the
        measurements the interpretation is based on.
      </p>

      <div className="page-sections">
        <PageSection
          title="Current conditions"
          description="Global geomagnetic activity, not a local aurora forecast."
          action={
            current.status === "ready"
              ? (
                <DataFreshness
                  status={current.data.freshness.status}
                  ageMinutes={
                    current.data.freshness.age_minutes
                  }
                />
              )
              : undefined
          }
        >
          <SourceState
            resource={current}
            loadingMessage="Loading NOAA geomagnetic data..."
          >
            {(conditions) => (
              <div className="ui-grid ui-grid-compact">
                <Card className="ui-span-all">
                  <div className="ui-stack">
                    <span className="ui-eyebrow">
                      Geomagnetic activity
                    </span>

                    <span className="ui-headline">
                      {conditions.geomagnetic_activity.label}
                    </span>

                    <div className="ui-badge-row">
                      <SeverityBadge
                        label={
                          conditions.geomagnetic_activity.noaa_scale
                            ?? "Below G1"
                        }
                        tone={toneForNoaaScale(
                          conditions.geomagnetic_activity.noaa_scale
                        )}
                      />
                    </div>
                  </div>
                </Card>

                <MetricCard
                  label={MEASUREMENTS.kp.label}
                  value={formatMeasurementValue(
                    "kp",
                    conditions.facts.kp
                  )}
                  footnote={observedFootnote(
                    conditions.observed_at
                  )}
                />

                <MetricCard
                  label="Running a-index"
                  value={conditions.facts.a_running}
                />
              </div>
            )}
          </SourceState>
        </PageSection>

        <PageSection
          title="Solar wind"
          description="The latest stored readings the risk assessment uses."
        >
          <SourceState
            resource={risk}
            loadingMessage="Loading the latest solar-wind readings..."
          >
            {(assessment) => {
              const raw = assessment.raw_values;

              return (
                <div className="ui-grid ui-grid-compact">
                  <MetricCard
                    label={MEASUREMENTS.solar_wind_speed.label}
                    value={
                      raw.solar_wind_speed_km_s === null
                        ? null
                        : formatMeasurementValue(
                          "solar_wind_speed",
                          raw.solar_wind_speed_km_s
                        )
                    }
                    unit={MEASUREMENTS.solar_wind_speed.unit}
                    footnote={observedFootnote(
                      raw.solar_wind_speed_observed_at
                    )}
                  />

                  <MetricCard
                    label={MEASUREMENTS.solar_wind_density.label}
                    value={
                      raw.solar_wind_density_per_cm3 === null
                        ? null
                        : formatMeasurementValue(
                          "solar_wind_density",
                          raw.solar_wind_density_per_cm3
                        )
                    }
                    unit={MEASUREMENTS.solar_wind_density.unit}
                    footnote={observedFootnote(
                      raw.solar_wind_density_observed_at
                    )}
                  />
                </div>
              );
            }}
          </SourceState>
        </PageSection>

        <PageSection
          title="Risk assessment"
          description="How AstroCast's rules read these measurements, and which rule fired."
        >
          <SourceState
            resource={risk}
            loadingMessage="Loading the risk assessment..."
          >
            {(assessment) => (
              <RiskAssessmentCard
                assessment={assessment}
              />
            )}
          </SourceState>
        </PageSection>

        <PageSection
          title="What this means"
        >
          <SourceState
            resource={current}
            loadingMessage="Loading the explanation..."
          >
            {(conditions) => (
              <ExplanationPanel
                explanation={
                  conditions.explanation_detail
                }
              />
            )}
          </SourceState>
        </PageSection>

        <p className="ui-caption">
          Source: {formatSource("NOAA_SWPC")}. Stored observations
          from the latest ingestion, not a live feed.
        </p>
      </div>
    </section>
  );
}

export default SpaceWeather;
