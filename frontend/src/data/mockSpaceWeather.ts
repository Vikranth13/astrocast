import type {
  CurrentSpaceWeather,
} from "../api/astrocastApi";

import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  RiskLevel,
} from "../components/ui/severity";

export type SpaceWeatherExplanation = {
  summary: string;
  details: string[];
  caveats: string[];
};

export type CurrentConditions =
  CurrentSpaceWeather & {
    explanation_detail: SpaceWeatherExplanation;
  };

export type SpaceWeatherRiskFactor = {
  rule_id: string;
  factor: string;
  value: number;
  unit: string;
  description: string;
};

export type SpaceWeatherRisk = {
  source: string;
  assessed_at: string;
  raw_values: {
    kp: number;
    kp_observed_at: string;
    solar_wind_speed_km_s: number | null;
    solar_wind_speed_observed_at: string | null;
    solar_wind_density_per_cm3: number | null;
    solar_wind_density_observed_at: string | null;
    solar_wind_station: string | null;
  };
  risk: {
    level: RiskLevel;
    contributing_factors: SpaceWeatherRiskFactor[];
    rule_ids: string[];
  };
};

export type SpaceWeatherAlert = {
  id: number;
  source: string;
  external_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity | null;
  issued_at: string;
  expires_at: string | null;
  status: AlertStatus;
  summary: string;
  ingested_at: string;
};

export type SpaceWeatherAlertDetail =
  SpaceWeatherAlert & {
    explanation: SpaceWeatherExplanation;
  };

// Caveat and detail wording is copied from the backend explanation
// service, so the mock reads exactly as the real responses will.

const INFORMATIONAL_CAVEAT =
  "AstroCast output is informational and depends on the accuracy and timeliness of the NOAA source data.";

const UNKNOWN_STATUS_CAVEAT =
  "NOAA did not supply an expiration time for this notification, so its current status cannot be determined from stored data.";

const AURORA_LOCATION_CAVEAT =
  "Geomagnetic activity alone does not establish whether aurora will be visible from a specific place. Local visibility also depends on geomagnetic latitude, hours of darkness, and cloud cover, none of which are included in this assessment.";

const GEOMAGNETIC_DETAIL =
  "Geomagnetic storms are disturbances of the Earth magnetic field driven by solar activity.";

const RADIO_BLACKOUT_DETAIL =
  "Radio blackouts are caused by solar flares and mainly affect high-frequency radio communication on the sunlit side of the Earth.";

const SOLAR_RADIATION_DETAIL =
  "Solar radiation storms involve energetic particles that can affect satellites, high-altitude aviation, and polar communication.";

const CURRENT_SUMMARY =
  "The planetary K-index is 5.33, which reaches NOAA G1 (minor geomagnetic storm).";

export const MOCK_CURRENT_CONDITIONS: CurrentConditions = {
  source: "NOAA_SWPC",
  metric_name: "planetary_k_index",
  observed_at: "2026-09-06T21:00:00Z",
  ingested_at: "2026-09-06T21:18:00Z",

  freshness: {
    status: "current",
    age_minutes: 42,
  },

  geomagnetic_activity: {
    level: "minor",
    label: "Minor geomagnetic storm",
    noaa_scale: "G1",
    is_storm: true,
  },

  facts: {
    kp: 5.33,
    a_running: 27,
    station_count: 8,
  },

  explanation: CURRENT_SUMMARY,

  explanation_detail: {
    summary: CURRENT_SUMMARY,
    details: [
      "The observation is 42 minutes old.",
      "The value was reported by 8 magnetometer stations.",
    ],
    caveats: [
      AURORA_LOCATION_CAVEAT,
      INFORMATIONAL_CAVEAT,
    ],
  },
};

export const MOCK_RISK: SpaceWeatherRisk = {
  source: "NOAA_SWPC",
  assessed_at: "2026-09-06T21:45:00Z",

  raw_values: {
    kp: 5.33,
    kp_observed_at: "2026-09-06T21:00:00Z",
    solar_wind_speed_km_s: 612,
    solar_wind_speed_observed_at: "2026-09-06T21:40:00Z",
    solar_wind_density_per_cm3: 8.4,
    solar_wind_density_observed_at: "2026-09-06T21:40:00Z",
    solar_wind_station: "DSCOVR",
  },

  risk: {
    level: "moderate",

    contributing_factors: [
      {
        rule_id: "KP_G1_G2",
        factor: "planetary_k_index",
        value: 5.33,
        unit: "index",
        description: "Kp of 5.33 is in the NOAA G1 to G2 storm range.",
      },

      {
        rule_id: "SW_SPEED_ELEVATED",
        factor: "solar_wind_speed",
        value: 612,
        unit: "km/s",
        description: "Solar wind speed of 612 km/s is above the elevated threshold.",
      },
    ],

    rule_ids: [
      "KP_G1_G2",
      "SW_SPEED_ELEVATED",
    ],
  },
};

export const MOCK_ALERTS: SpaceWeatherAlertDetail[] = [
  {
    id: 7,
    source: "NOAA_SWPC",
    external_id: "WARK05",
    alert_type: "warning",
    severity: "G1",
    issued_at: "2026-09-06T21:40:00Z",
    expires_at: "2026-09-07T06:00:00Z",
    status: "active",
    summary: "Geomagnetic K-index of 5 expected",
    ingested_at: "2026-09-06T21:45:00Z",

    explanation: {
      summary:
        "NOAA issued a G1 geomagnetic storm warning at 2026-09-06 21:40 UTC. A warning means the described conditions are expected. It is still active and is due to expire at 2026-09-07 06:00 UTC.",
      details: [GEOMAGNETIC_DETAIL],
      caveats: [INFORMATIONAL_CAVEAT],
    },
  },

  {
    id: 6,
    source: "NOAA_SWPC",
    external_id: "ALTK05",
    alert_type: "alert",
    severity: "G1",
    issued_at: "2026-09-06T19:12:00Z",
    expires_at: null,
    status: "unknown",
    summary: "Geomagnetic K-index of 5 reached",
    ingested_at: "2026-09-06T19:15:00Z",

    explanation: {
      summary:
        "NOAA issued a G1 geomagnetic storm alert at 2026-09-06 19:12 UTC. An alert means the described conditions have been observed. NOAA did not supply an expiration time, so AstroCast cannot determine whether it is still in effect.",
      details: [GEOMAGNETIC_DETAIL],
      caveats: [
        UNKNOWN_STATUS_CAVEAT,
        INFORMATIONAL_CAVEAT,
      ],
    },
  },

  {
    id: 5,
    source: "NOAA_SWPC",
    external_id: "WATA20",
    alert_type: "watch",
    severity: "G2",
    issued_at: "2026-09-06T12:30:00Z",
    expires_at: "2026-09-08T00:00:00Z",
    status: "active",
    summary: "Geomagnetic storm category G2 predicted",
    ingested_at: "2026-09-06T12:34:00Z",

    explanation: {
      summary:
        "NOAA issued a G2 geomagnetic storm watch at 2026-09-06 12:30 UTC. A watch means the described conditions are considered possible. It is still active and is due to expire at 2026-09-08 00:00 UTC.",
      details: [GEOMAGNETIC_DETAIL],
      caveats: [INFORMATIONAL_CAVEAT],
    },
  },

  {
    id: 4,
    source: "NOAA_SWPC",
    external_id: "ALTXMF",
    alert_type: "alert",
    severity: "R1",
    issued_at: "2026-09-05T14:05:00Z",
    expires_at: "2026-09-05T15:00:00Z",
    status: "expired",
    summary: "X-ray flux exceeded M1",
    ingested_at: "2026-09-05T14:09:00Z",

    explanation: {
      summary:
        "NOAA issued an R1 radio blackout alert at 2026-09-05 14:05 UTC. An alert means the described conditions have been observed. It expired at 2026-09-05 15:00 UTC.",
      details: [RADIO_BLACKOUT_DETAIL],
      caveats: [INFORMATIONAL_CAVEAT],
    },
  },

  {
    id: 3,
    source: "NOAA_SWPC",
    external_id: "WARPX1",
    alert_type: "warning",
    severity: "S1",
    issued_at: "2026-09-04T09:20:00Z",
    expires_at: "2026-09-05T09:20:00Z",
    status: "expired",
    summary: "Proton 10 MeV integral flux above 10 pfu expected",
    ingested_at: "2026-09-04T09:24:00Z",

    explanation: {
      summary:
        "NOAA issued an S1 solar radiation storm warning at 2026-09-04 09:20 UTC. A warning means the described conditions are expected. It expired at 2026-09-05 09:20 UTC.",
      details: [SOLAR_RADIATION_DETAIL],
      caveats: [INFORMATIONAL_CAVEAT],
    },
  },

  {
    id: 2,
    source: "NOAA_SWPC",
    external_id: "SUMX05",
    alert_type: "summary",
    severity: "R2",
    issued_at: "2026-09-03T22:47:00Z",
    expires_at: null,
    status: "unknown",
    summary: "X-ray event exceeded M5",
    ingested_at: "2026-09-03T22:52:00Z",

    explanation: {
      summary:
        "NOAA issued an R2 radio blackout summary at 2026-09-03 22:47 UTC. A summary describes an event that has already occurred. NOAA did not supply an expiration time, so AstroCast cannot determine whether it is still in effect.",
      details: [RADIO_BLACKOUT_DETAIL],
      caveats: [
        UNKNOWN_STATUS_CAVEAT,
        INFORMATIONAL_CAVEAT,
      ],
    },
  },

  {
    id: 1,
    source: "NOAA_SWPC",
    external_id: "CANA20",
    alert_type: "cancellation",
    severity: null,
    issued_at: "2026-09-02T08:00:00Z",
    expires_at: "2026-09-02T08:00:00Z",
    status: "expired",
    summary: "Cancel watch: geomagnetic storm category G2 predicted",
    ingested_at: "2026-09-02T08:03:00Z",

    explanation: {
      summary:
        "NOAA issued a space-weather cancellation at 2026-09-02 08:00 UTC. A cancellation withdraws a previously issued notification. It expired at 2026-09-02 08:00 UTC.",
      details: [],
      caveats: [INFORMATIONAL_CAVEAT],
    },
  },
];
