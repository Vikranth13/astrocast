import {
  useMemo,
  useState,
} from "react";

import {
  getKpTrend,
  getSolarWindTrend,
} from "../api/spaceWeatherApi";

import type {
  TrendThreshold,
} from "../api/types/spaceWeather";

import SourceState from "../components/SourceState";

import TrendLineChart, {
  type ChartThreshold,
} from "../components/trends/TrendLineChart";

import Card from "../components/ui/Card";
import PageSection from "../components/ui/PageSection";

import {
  useApiResource,
} from "../hooks/useApiResource";

import {
  formatSource,
} from "../utils/format";

const WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const WINDOW_LABEL = "Past 7 days";

const KP_TICKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// NOAA publishes Kp every three hours, so readings further apart than
// that mean some were not stored.
const KP_INTERVAL_MINUTES = 180;

const HOURLY_AVERAGES = {
  one: "hourly average",
  many: "hourly averages",
};

const HOURS = {
  one: "hour",
  many: "hours",
};

type TrendWindow = {
  start: string;
  end: string;
};

function pastWeek(): TrendWindow {
  const end = Date.now();

  return {
    start: new Date(end - WINDOW_DAYS * DAY_MS).toISOString(),
    end: new Date(end).toISOString(),
  };
}

// The backend sends the thresholds for every factor in the response.
// Each chart draws only its own.
function linesFor(
  thresholds: TrendThreshold[],
  factor: string
): ChartThreshold[] {
  return thresholds
    .filter((threshold) => threshold.factor === factor)
    .map((threshold) => ({
      value: threshold.value,
      label: threshold.label,
    }));
}

function Trends() {
  // Fixed when the page opens, so every chart covers the same week.
  const [trendWindow] = useState(pastWeek);

  const loadKp = useMemo(
    () => () => getKpTrend({
      start: trendWindow.start,
      end: trendWindow.end,
    }),
    [trendWindow]
  );

  const loadSolarWind = useMemo(
    () => () => getSolarWindTrend({
      start: trendWindow.start,
      end: trendWindow.end,
      interval: "hour",
    }),
    [trendWindow]
  );

  const kpTrend = useApiResource(loadKp);
  const solarWindTrend = useApiResource(loadSolarWind);

  const windowProps = {
    windowStart: trendWindow.start,
    windowEnd: trendWindow.end,
    windowLabel: WINDOW_LABEL,
  };

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
          description="The three-hour global geomagnetic index, from 0 to 9. NOAA classes it as a geomagnetic storm from G1 upward."
        >
          <Card>
            <SourceState
              resource={kpTrend}
              loadingMessage="Loading the Kp trend..."
            >
              {(trend) => (
                <TrendLineChart
                  title="Planetary K-index"
                  points={trend.points}
                  measurement="kp"
                  curve="stepAfter"
                  yDomain={[0, 9]}
                  yTicks={KP_TICKS}
                  maxGapMinutes={KP_INTERVAL_MINUTES}
                  thresholds={linesFor(
                    trend.thresholds,
                    "planetary_k_index"
                  )}
                  {...windowProps}
                />
              )}
            </SourceState>
          </Card>
        </PageSection>

        <PageSection
          title="Solar wind speed"
          description="Measured upstream of Earth by the DSCOVR spacecraft, shown as hourly averages. The dashed line is the speed AstroCast's risk rules treat as elevated."
        >
          <Card>
            <SourceState
              resource={solarWindTrend}
              loadingMessage="Loading the solar-wind trend..."
            >
              {(trend) => (
                <TrendLineChart
                  title="Solar wind speed"
                  points={trend.points.map((point) => ({
                    observed_at: point.observed_at,
                    value: point.speed_km_s,
                  }))}
                  measurement="solar_wind_speed"
                  readings={HOURLY_AVERAGES}
                  slots={HOURS}
                  thresholds={linesFor(
                    trend.thresholds,
                    "solar_wind_speed"
                  )}
                  {...windowProps}
                />
              )}
            </SourceState>
          </Card>
        </PageSection>

        <PageSection
          title="Solar wind density"
          description="Protons per cubic centimetre in the solar wind, shown as hourly averages. The dashed line is the density AstroCast's risk rules treat as elevated."
        >
          <Card>
            <SourceState
              resource={solarWindTrend}
              loadingMessage="Loading the solar-wind trend..."
            >
              {(trend) => (
                <TrendLineChart
                  title="Solar wind density"
                  points={trend.points.map((point) => ({
                    observed_at: point.observed_at,
                    value: point.density_per_cm3,
                  }))}
                  measurement="solar_wind_density"
                  readings={HOURLY_AVERAGES}
                  slots={HOURS}
                  thresholds={linesFor(
                    trend.thresholds,
                    "solar_wind_density"
                  )}
                  {...windowProps}
                />
              )}
            </SourceState>
          </Card>
        </PageSection>

        <p className="ui-caption">
          Source: {formatSource("NOAA_SWPC")}. Stored observations
          from past ingestions, with times in UTC. A gap in a line
          means no measurement was stored for that time, not that
          activity stopped.
        </p>
      </div>
    </section>
  );
}

export default Trends;
