import type {
  ActivityLevel,
  FreshnessStatus,
  RiskLevel,
  SpaceWeatherAlertResponse,
} from "../api/types/spaceWeather";

import {
  MOCK_ALERTS,
  MOCK_CURRENT_CONDITIONS,
  MOCK_RISK,
} from "./mockSpaceWeather";

import {
  MOCK_KP_TREND,
  MOCK_SOLAR_WIND_TREND,
} from "./mockTrends";

export type ObservingStatus = {
  score: number;
  rating: string;
  summary: string;
  limitingFactor: string;
};

export type BestWindow = {
  startsAt: string;
  endsAt: string;
  quality: string;
  note: string;
};

export type MoonSnapshot = {
  phase: string;
  illuminationPercent: number;
  setsAt: string;
  interference: string;
};

export type GeomagneticSnapshot = {
  kp: number;
  activityLabel: string;
  activityLevel: ActivityLevel;
  noaaScale: string | null;
  riskLevel: RiskLevel;
  freshnessStatus: FreshnessStatus;
  freshnessAgeMinutes: number;
};

export type RecommendedTarget = {
  name: string;
  kind: string;
  bestAt: string;
  altitudeDegrees: number;
  reason: string;
};

export type MiniTrendPoint = {
  observed_at: string;
  value: number | null;
};

export type MiniTrend = {
  metric: string;
  unit: string;
  decimals: number;
  current: number;
  change: number;
  points: MiniTrendPoint[];
};

export type DashboardSnapshot = {
  observing: ObservingStatus;
  bestWindow: BestWindow;
  moon: MoonSnapshot;
  geomagnetic: GeomagneticSnapshot;
  latestAlert: SpaceWeatherAlertResponse | null;
  recommendedTarget: RecommendedTarget;
  trends: MiniTrend[];
};

// The trend series hold one reading every three hours.
const READINGS_PER_DAY = 8;

function measuredValueAt(
  series: MiniTrendPoint[],
  index: number
): number {
  const value = series[index]?.value;

  if (value === null || value === undefined) {
    throw new Error(
      `Mock trend has no measurement at index ${index}.`
    );
  }

  return value;
}

// Derived from the same week of data the Trends page charts, so the
// Dashboard can never disagree with it. The change compares the latest
// reading with the one exactly 24 hours earlier.
function buildMiniTrend(
  metric: string,
  unit: string,
  decimals: number,
  series: MiniTrendPoint[]
): MiniTrend {
  const lastIndex = series.length - 1;

  const current = measuredValueAt(
    series,
    lastIndex
  );

  const dayEarlier = measuredValueAt(
    series,
    lastIndex - READINGS_PER_DAY
  );

  const precision = 10 ** decimals;

  return {
    metric,
    unit,
    decimals,
    current,
    change:
      Math.round((current - dayEarlier) * precision)
      / precision,
    points: series.slice(-READINGS_PER_DAY),
  };
}

export const MOCK_DASHBOARD: DashboardSnapshot = {
  observing: {
    score: 74,
    rating: "Good",
    summary:
      "Clear skies and light wind. Moonlight is the main thing working against you tonight.",
    limitingFactor: "Moonlight",
  },

  bestWindow: {
    startsAt: "01:55",
    endsAt: "04:40",
    quality: "Best after moonset",
    note: "Transparency holds until astronomical twilight begins.",
  },

  moon: {
    phase: "Waxing gibbous",
    illuminationPercent: 68,
    setsAt: "01:52",
    interference: "Washes out faint targets until it sets.",
  },

  geomagnetic: {
    kp: MOCK_CURRENT_CONDITIONS.facts.kp,
    activityLabel:
      MOCK_CURRENT_CONDITIONS.geomagnetic_activity.label,
    activityLevel:
      MOCK_CURRENT_CONDITIONS.geomagnetic_activity.level,
    noaaScale:
      MOCK_CURRENT_CONDITIONS.geomagnetic_activity.noaa_scale,
    riskLevel: MOCK_RISK.risk.level,
    freshnessStatus:
      MOCK_CURRENT_CONDITIONS.freshness.status,
    freshnessAgeMinutes:
      MOCK_CURRENT_CONDITIONS.freshness.age_minutes,
  },

  latestAlert: MOCK_ALERTS[0] ?? null,

  recommendedTarget: {
    name: "Andromeda Galaxy (M31)",
    kind: "Galaxy",
    bestAt: "02:30",
    altitudeDegrees: 62,
    reason:
      "High in the east after moonset, and bright enough to hold up under a Kp 5 sky.",
  },

  trends: [
    buildMiniTrend(
      "Planetary Kp",
      "index",
      2,
      MOCK_KP_TREND.points
    ),

    buildMiniTrend(
      "Solar wind speed",
      "km/s",
      0,
      MOCK_SOLAR_WIND_TREND.points.map(
        (point) => ({
          observed_at: point.observed_at,
          value: point.speed_km_s,
        })
      )
    ),
  ],
};
