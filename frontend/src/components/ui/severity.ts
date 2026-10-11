export type Tone =
  | "quiet"
  | "info"
  | "caution"
  | "warning"
  | "critical";

export type FreshnessStatus =
  | "current"
  | "delayed"
  | "stale";

export type RiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "severe";

export type ActivityLevel =
  | "below_storm"
  | "minor"
  | "moderate"
  | "strong"
  | "severe"
  | "extreme";

export const ALERT_STATUSES = [
  "active",
  "expired",
  "unknown",
] as const;

export type AlertStatus =
  (typeof ALERT_STATUSES)[number];

export const ALERT_TYPES = [
  "alert",
  "warning",
  "watch",
  "summary",
  "cancellation",
  "other",
] as const;

export type AlertType =
  (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = [
  "G1", "G2", "G3", "G4", "G5",
  "R1", "R2", "R3", "R4", "R5",
  "S1", "S2", "S3", "S4", "S5",
] as const;

export type AlertSeverity =
  (typeof ALERT_SEVERITIES)[number];

const NOAA_SCALE_TONES: Record<string, Tone> = {
  "1": "caution",
  "2": "caution",
  "3": "warning",
  "4": "critical",
  "5": "critical",
};

const RISK_LEVEL_TONES: Record<RiskLevel, Tone> = {
  low: "quiet",
  moderate: "caution",
  high: "warning",
  severe: "critical",
};

const ACTIVITY_LEVEL_TONES: Record<ActivityLevel, Tone> = {
  below_storm: "quiet",
  minor: "caution",
  moderate: "caution",
  strong: "warning",
  severe: "critical",
  extreme: "critical",
};

const FRESHNESS_TONES: Record<FreshnessStatus, Tone> = {
  current: "info",
  delayed: "caution",
  stale: "warning",
};

const ALERT_STATUS_TONES: Record<AlertStatus, Tone> = {
  active: "info",
  expired: "quiet",
  unknown: "quiet",
};

export function toneForNoaaScale(
  code: string | null | undefined
): Tone {
  if (!code) {
    return "quiet";
  }

  return NOAA_SCALE_TONES[code.slice(1)] ?? "quiet";
}

export function toneForRiskLevel(
  level: RiskLevel
): Tone {
  return RISK_LEVEL_TONES[level] ?? "quiet";
}

export function toneForActivityLevel(
  level: ActivityLevel
): Tone {
  return ACTIVITY_LEVEL_TONES[level] ?? "quiet";
}

export function toneForFreshness(
  status: FreshnessStatus
): Tone {
  return FRESHNESS_TONES[status] ?? "quiet";
}

export function toneForAlertStatus(
  status: AlertStatus
): Tone {
  return ALERT_STATUS_TONES[status] ?? "quiet";
}
