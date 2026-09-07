import type {
  ActivityLevel,
  AlertStatus,
  FreshnessStatus,
  RiskLevel,
} from "../components/ui/severity";

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

export type LatestAlert = {
  alertType: string;
  severity: string | null;
  status: AlertStatus;
  issuedAt: string;
  summary: string;
};

export type RecommendedTarget = {
  name: string;
  kind: string;
  bestAt: string;
  altitudeDegrees: number;
  reason: string;
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type MiniTrend = {
  metric: string;
  unit: string;
  current: number;
  change: number;
  points: TrendPoint[];
};

export type DashboardSnapshot = {
  observing: ObservingStatus;
  bestWindow: BestWindow;
  moon: MoonSnapshot;
  geomagnetic: GeomagneticSnapshot;
  latestAlert: LatestAlert | null;
  recommendedTarget: RecommendedTarget;
  trends: MiniTrend[];
};

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
    kp: 5.33,
    activityLabel: "Minor geomagnetic storm",
    activityLevel: "minor",
    noaaScale: "G1",
    riskLevel: "moderate",
    freshnessStatus: "current",
    freshnessAgeMinutes: 42,
  },

  latestAlert: {
    alertType: "warning",
    severity: "G1",
    status: "active",
    issuedAt: "21:40 UTC",
    summary:
      "Geomagnetic K-index of 5 expected. Aurora may be visible at high latitudes.",
  },

  recommendedTarget: {
    name: "Andromeda Galaxy (M31)",
    kind: "Galaxy",
    bestAt: "02:30",
    altitudeDegrees: 62,
    reason:
      "High in the east after moonset, and bright enough to hold up under a Kp 5 sky.",
  },

  trends: [
    {
      metric: "Planetary Kp",
      unit: "index",
      current: 5.33,
      change: 1.66,
      points: [
        { label: "00:00", value: 2.33 },
        { label: "03:00", value: 2.67 },
        { label: "06:00", value: 3.0 },
        { label: "09:00", value: 3.67 },
        { label: "12:00", value: 3.33 },
        { label: "15:00", value: 4.33 },
        { label: "18:00", value: 5.0 },
        { label: "21:00", value: 5.33 },
      ],
    },

    {
      metric: "Solar wind speed",
      unit: "km/s",
      current: 612,
      change: 148,
      points: [
        { label: "00:00", value: 421 },
        { label: "03:00", value: 438 },
        { label: "06:00", value: 464 },
        { label: "09:00", value: 502 },
        { label: "12:00", value: 547 },
        { label: "15:00", value: 578 },
        { label: "18:00", value: 604 },
        { label: "21:00", value: 612 },
      ],
    },
  ],
};
