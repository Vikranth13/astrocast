import type {
  SolarWindTrendResponse,
  SpaceWeatherTrendResponse,
  TrendThreshold,
} from "../api/types/spaceWeather";

// Test fixtures in the shape the trend endpoints return. Seven days of
// three-hour readings, ending at the same moment and the same values as
// the space-weather fixtures.
const PERIOD_START_MS = Date.UTC(2026, 7, 31, 0, 0);

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

function timestampAt(
  index: number
): string {
  return new Date(
    PERIOD_START_MS + index * THREE_HOURS_MS
  ).toISOString();
}

// Kp is published in thirds, so every value ends in .00, .33, or .67.
const KP_VALUES = [
  1.33, 1.0, 1.33, 1.67, 2.0, 1.67, 1.33, 1.0,
  0.67, 1.0, 1.33, 1.0, 1.67, 2.0, 2.33, 2.0,
  1.67, 1.33, 1.0, 1.33, 1.67, 1.33, 1.0, 1.33,
  2.0, 2.67, 3.0, 2.67, 2.33, 2.0, 1.67, 2.0,
  2.33, 2.0, 1.67, 1.33, 1.67, 2.0, 2.33, 2.67,
  3.0, 3.33, 3.67, 4.0, 3.67, 3.0, 2.67, 2.33,
  2.33, 2.67, 3.0, 3.67, 3.33, 4.33, 5.0, 5.33,
];

// One reading is missing on 2 September, as happens when a plasma
// measurement is not reported, so the charts show a real gap.
const SOLAR_WIND_SPEEDS = [
  372, 368, 361, 355, 359, 364, 370, 366,
  358, 352, 349, 356, 362, 371, 380, 384,
  379, 371, 366, 362, null, 358, 355, 361,
  402, 438, 461, 455, 447, 431, 418, 409,
  398, 391, 385, 379, 384, 392, 401, 408,
  426, 447, 472, 489, 481, 466, 448, 432,
  421, 438, 464, 502, 547, 578, 604, 612,
];

const SOLAR_WIND_DENSITIES = [
  4.2, 4.5, 4.1, 3.8, 3.9, 4.3, 4.6, 4.4,
  4.8, 5.1, 5.4, 5.0, 4.7, 4.5, 4.9, 5.3,
  5.6, 5.2, 4.9, 4.6, null, 4.4, 4.8, 5.1,
  9.8, 12.4, 11.1, 9.3, 7.9, 6.8, 6.1, 5.7,
  5.4, 5.0, 4.8, 4.6, 4.9, 5.2, 5.6, 6.0,
  6.8, 7.9, 9.1, 8.6, 7.7, 6.9, 6.3, 5.9,
  5.6, 6.1, 6.9, 7.8, 9.2, 10.6, 9.4, 8.4,
];

// The thresholds the backend serves with each trend, from the risk
// engine's constants.
export const KP_THRESHOLDS: TrendThreshold[] = [
  {
    rule_id: "KP_G1_G2",
    factor: "planetary_k_index",
    value: 4.67,
    unit: "index",
    label: "G1 storm",
  },
];

export const SOLAR_WIND_THRESHOLDS: TrendThreshold[] = [
  {
    rule_id: "SW_SPEED_ELEVATED",
    factor: "solar_wind_speed",
    value: 500,
    unit: "km/s",
    label: "Elevated",
  },

  {
    rule_id: "SW_DENSITY_ELEVATED",
    factor: "solar_wind_density",
    value: 10,
    unit: "1/cm^3",
    label: "Elevated",
  },
];

export const MOCK_KP_TREND: SpaceWeatherTrendResponse = {
  source: "NOAA_SWPC",
  metric_name: "planetary_k_index",
  unit: "index",
  count: KP_VALUES.length,

  points: KP_VALUES.map(
    (value, index) => ({
      observed_at: timestampAt(index),
      value,
    })
  ),

  thresholds: KP_THRESHOLDS,
};

export const MOCK_SOLAR_WIND_TREND: SolarWindTrendResponse = {
  source: "NOAA_SWPC",
  interval: "reading",
  count: SOLAR_WIND_SPEEDS.length,

  points: SOLAR_WIND_SPEEDS.map(
    (speed, index) => ({
      observed_at: timestampAt(index),
      station: "DSCOVR",
      speed_km_s: speed,
      density_per_cm3: SOLAR_WIND_DENSITIES[index],
      temperature_k: null,
    })
  ),

  thresholds: SOLAR_WIND_THRESHOLDS,
};
