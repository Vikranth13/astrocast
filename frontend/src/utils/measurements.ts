// One place that decides how each measured quantity is written, so the
// same reading looks the same on every page.

export type MeasurementKind =
  | "kp"
  | "solar_wind_speed"
  | "solar_wind_density"
  | "solar_wind_temperature";

type MeasurementFormat = {
  label: string;
  // Kp is a dimensionless index, so it is written without a unit.
  unit: string;
  decimals: number;
};

export const MEASUREMENTS: Record<MeasurementKind, MeasurementFormat> = {
  kp: {
    label: "Planetary Kp",
    unit: "",
    decimals: 2,
  },

  solar_wind_speed: {
    label: "Solar wind speed",
    unit: "km/s",
    decimals: 0,
  },

  solar_wind_density: {
    label: "Solar wind density",
    unit: "per cm³",
    decimals: 1,
  },

  solar_wind_temperature: {
    label: "Solar wind temperature",
    unit: "K",
    decimals: 0,
  },
};

// The backend names factors after its stored metrics.
const FACTOR_KINDS: Record<string, MeasurementKind> = {
  planetary_k_index: "kp",
  solar_wind_speed: "solar_wind_speed",
  solar_wind_density: "solar_wind_density",
  solar_wind_temperature: "solar_wind_temperature",
};

const MISSING_VALUE = "—";

export function measurementForFactor(
  factor: string
): MeasurementKind | null {
  return FACTOR_KINDS[factor] ?? null;
}

// The number alone, at the quantity's usual precision.
export function formatMeasurementValue(
  kind: MeasurementKind,
  value: number | null
): string {
  if (value === null) {
    return MISSING_VALUE;
  }

  return value.toFixed(
    MEASUREMENTS[kind].decimals
  );
}

// The number with its unit, for sentences and summaries.
export function formatMeasurementWithUnit(
  kind: MeasurementKind,
  value: number | null
): string {
  if (value === null) {
    return MISSING_VALUE;
  }

  const { unit } = MEASUREMENTS[kind];

  const number = formatMeasurementValue(
    kind,
    value
  );

  return unit
    ? `${number} ${unit}`
    : number;
}
