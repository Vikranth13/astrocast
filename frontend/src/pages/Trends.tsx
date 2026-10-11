import TrendLineChart from "../components/trends/TrendLineChart";

import Card from "../components/ui/Card";
import PageSection from "../components/ui/PageSection";

import {
  MOCK_KP_TREND,
  MOCK_SOLAR_WIND_TREND,
} from "../data/mockTrends";

import {
  formatSource,
} from "../utils/format";

// These mirror the thresholds in
// backend/services/space_weather_risk_service.py, so the lines on the
// charts are the same lines the risk engine applies.
const G1_THRESHOLD = 4.67;

const SOLAR_WIND_ELEVATED_SPEED_KM_S = 500;

const SOLAR_WIND_ELEVATED_DENSITY_PER_CM3 = 10;

const KP_TICKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function formatKp(
  value: number
): string {
  return value.toFixed(2);
}

function Trends() {
  const speedPoints = MOCK_SOLAR_WIND_TREND.points.map(
    (point) => ({
      observed_at: point.observed_at,
      value: point.speed_km_s,
    })
  );

  const densityPoints = MOCK_SOLAR_WIND_TREND.points.map(
    (point) => ({
      observed_at: point.observed_at,
      value: point.density_per_cm3,
    })
  );

  return (
    <section className="page">
      <h1>Trends</h1>

      <p className="page-intro">
        How geomagnetic activity and the solar wind have moved over
        the past week.
      </p>

      <div className="page-sections">
        <PageSection
          title="Planetary K-index"
          description="The three-hour global geomagnetic index, from 0 to 9. From 4.67 upward, NOAA classes it as a G1 storm."
        >
          <Card>
            <TrendLineChart
              title="Planetary K-index"
              points={MOCK_KP_TREND.points}
              unit=""
              curve="stepAfter"
              yDomain={[0, 9]}
              yTicks={KP_TICKS}
              thresholds={[
                {
                  value: G1_THRESHOLD,
                  label: "G1 storm",
                },
              ]}
              formatValue={formatKp}
            />
          </Card>
        </PageSection>

        <PageSection
          title="Solar wind speed"
          description="Measured upstream of Earth by the DSCOVR spacecraft. AstroCast treats 500 km/s and above as elevated."
        >
          <Card>
            <TrendLineChart
              title="Solar wind speed"
              points={speedPoints}
              unit="km/s"
              thresholds={[
                {
                  value: SOLAR_WIND_ELEVATED_SPEED_KM_S,
                  label: "Elevated",
                },
              ]}
            />
          </Card>
        </PageSection>

        <PageSection
          title="Solar wind density"
          description="Protons per cubic centimetre in the solar wind. AstroCast treats 10 and above as elevated."
        >
          <Card>
            <TrendLineChart
              title="Solar wind density"
              points={densityPoints}
              unit="per cm³"
              thresholds={[
                {
                  value: SOLAR_WIND_ELEVATED_DENSITY_PER_CM3,
                  label: "Elevated",
                },
              ]}
            />
          </Card>
        </PageSection>

        <p className="ui-caption">
          Source: {formatSource(MOCK_KP_TREND.source)}.
          Stored observations from past ingestions, with times in
          UTC. A gap in a line means no measurement was stored for
          that time, not that activity stopped.
        </p>
      </div>
    </section>
  );
}

export default Trends;
