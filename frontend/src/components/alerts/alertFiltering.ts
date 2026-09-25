import {
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ALERT_TYPES,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
} from "../ui/severity";

// Parameter names match the backend's GET /api/space-weather/alerts
// query parameters, so Week 5 can forward the page URL's filters to
// the API unchanged. Note the data field is alert_type, but the
// query parameter is type.
export const ALERT_FILTER_PARAMS = [
  "severity",
  "type",
  "status",
] as const;

export type AlertFilterName =
  (typeof ALERT_FILTER_PARAMS)[number];

export type AlertFilterState = {
  severity: AlertSeverity | null;
  type: AlertType | null;
  status: AlertStatus | null;
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  alert: "Alert",
  warning: "Warning",
  watch: "Watch",
  summary: "Summary",
  cancellation: "Cancellation",
  other: "Other",
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  active: "Active",
  expired: "Expired",
  unknown: "Status unknown",
};

export const SEVERITY_FAMILIES = [
  {
    prefix: "G",
    label: "Geomagnetic storm",
  },

  {
    prefix: "R",
    label: "Radio blackout",
  },

  {
    prefix: "S",
    label: "Solar radiation storm",
  },
];

type FilterableAlert = {
  severity: AlertSeverity | null;
  alert_type: AlertType;
  status: AlertStatus;
};

function pickAllowed<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | null {
  if (value === null) {
    return null;
  }

  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function readAlertFilters(
  params: URLSearchParams
): AlertFilterState {
  return {
    severity: pickAllowed(
      params.get("severity"),
      ALERT_SEVERITIES
    ),

    type: pickAllowed(
      params.get("type"),
      ALERT_TYPES
    ),

    status: pickAllowed(
      params.get("status"),
      ALERT_STATUSES
    ),
  };
}

export function hasActiveFilters(
  filters: AlertFilterState
): boolean {
  return (
    filters.severity !== null
    || filters.type !== null
    || filters.status !== null
  );
}

export function filterAlerts<T extends FilterableAlert>(
  alerts: T[],
  filters: AlertFilterState
): T[] {
  return alerts.filter((alert) => {
    if (
      filters.severity !== null
      && alert.severity !== filters.severity
    ) {
      return false;
    }

    if (
      filters.type !== null
      && alert.alert_type !== filters.type
    ) {
      return false;
    }

    if (
      filters.status !== null
      && alert.status !== filters.status
    ) {
      return false;
    }

    return true;
  });
}

export function severityFamilyLabel(
  severity: AlertSeverity | null
): string | null {
  if (severity === null) {
    return null;
  }

  const family = SEVERITY_FAMILIES.find(
    (candidate) =>
      severity.startsWith(candidate.prefix)
  );

  return family ? family.label : null;
}
