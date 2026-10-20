import {
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ALERT_TYPES,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
} from "../../api/types/spaceWeather";

// Parameter names match the backend's GET /api/space-weather/alerts
// query parameters, so the page forwards its URL filters to the API
// unchanged and the backend does the filtering. Note the data field is
// alert_type, but the query parameter is type.
export const ALERT_FILTER_PARAMS = [
  "severity",
  "type",
  "status",
] as const;

export const ALERT_PAGE_PARAM = "page";

export const ALERT_PAGE_SIZE = 25;

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

// Pages are numbered from 1 in the address. Anything that is not a
// whole number of at least 1 reads as the first page.
export function readAlertPage(
  params: URLSearchParams
): number {
  const raw = params.get(ALERT_PAGE_PARAM);

  if (raw === null || !/^\d+$/.test(raw)) {
    return 1;
  }

  return Math.max(1, Number(raw));
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
