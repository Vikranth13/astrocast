import ExplanationPanel from "../components/spaceWeather/ExplanationPanel";
import RiskAssessmentCard from "../components/spaceWeather/RiskAssessmentCard";

import Card from "../components/ui/Card";
import DataFreshness from "../components/ui/DataFreshness";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";
import SeverityBadge from "../components/ui/SeverityBadge";

import {
  toneForNoaaScale,
} from "../components/ui/severity";

import {
  MOCK_CURRENT_CONDITIONS,
  MOCK_RISK,
} from "../data/mockSpaceWeather";

import {
  formatSource,
  formatUtc,
} from "../utils/format";

import "../components/spaceWeather/spaceWeather.css";

function SpaceWeather() {
  const conditions = MOCK_CURRENT_CONDITIONS;
  const rawValues = MOCK_RISK.raw_values;
  const activity = conditions.geomagnetic_activity;

  return (
    <section className="page">
      <h1>Space Weather</h1>

      <p className="page-intro">
        Current geomagnetic conditions from NOAA SWPC, shown with the
        measurements the interpretation is based on.
      </p>

      <div className="space-weather-page">
        <section className="space-weather-section">
          <SectionHeader
            title="Current conditions"
            description="Global geomagnetic activity, not a local aurora forecast."
            action={
              <DataFreshness
                status={conditions.freshness.status}
                ageMinutes={
                  conditions.freshness.age_minutes
                }
              />
            }
          />

          <div className="condition-grid">
            <Card className="condition-activity">
              <span className="condition-label">
                Geomagnetic activity
              </span>

              <span className="condition-headline">
                {activity.label}
              </span>

              <div className="condition-badges">
                <SeverityBadge
                  label={
                    activity.noaa_scale
                      ?? "Below G1"
                  }
                  tone={toneForNoaaScale(
                    activity.noaa_scale
                  )}
                />
              </div>
            </Card>

            <MetricCard
              label="Planetary Kp"
              value={conditions.facts.kp.toFixed(2)}
              unit="index"
              footnote={`Observed ${formatUtc(
                conditions.observed_at
              )}`}
            />

            <MetricCard
              label="Running a-index"
              value={conditions.facts.a_running}
            />

            <MetricCard
              label="Solar wind speed"
              value={rawValues.solar_wind_speed_km_s}
              unit="km/s"
              footnote={
                rawValues.solar_wind_station
                  ?? undefined
              }
            />

            <MetricCard
              label="Solar wind density"
              value={
                rawValues.solar_wind_density_per_cm3
              }
              unit="per cm³"
            />
          </div>
        </section>

        <section className="space-weather-section">
          <SectionHeader
            title="Risk assessment"
            description="How AstroCast's rules read these measurements, and which rule fired."
          />

          <RiskAssessmentCard
            assessment={MOCK_RISK}
          />
        </section>

        <section className="space-weather-section">
          <SectionHeader
            title="What this means"
          />

          <ExplanationPanel
            explanation={
              conditions.explanation_detail
            }
          />
        </section>

        <p className="space-weather-source">
          Source: {formatSource(conditions.source)}.
          Stored observations from the latest ingestion,
          not a live feed.
        </p>
      </div>
    </section>
  );
}

export default SpaceWeather;
