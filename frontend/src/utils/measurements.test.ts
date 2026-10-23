import {
  describe,
  expect,
  it,
} from "vitest";

import {
  formatMeasurementValue,
  formatMeasurementWithUnit,
  measurementForFactor,
} from "./measurements";


describe(
  "measurement formats",
  () => {
    it(
      "writes each quantity at its usual precision",
      () => {
        expect(
          formatMeasurementValue("kp", 2.3333)
        ).toBe("2.33");

        expect(
          formatMeasurementValue("solar_wind_speed", 412.6)
        ).toBe("413");

        expect(
          formatMeasurementValue("solar_wind_density", 4)
        ).toBe("4.0");
      }
    );


    it(
      "adds the unit, except for the dimensionless Kp",
      () => {
        expect(
          formatMeasurementWithUnit("solar_wind_speed", 500)
        ).toBe("500 km/s");

        expect(
          formatMeasurementWithUnit("solar_wind_density", 10)
        ).toBe("10.0 per cm³");

        expect(
          formatMeasurementWithUnit("kp", 4.67)
        ).toBe("4.67");
      }
    );


    it(
      "marks a missing reading instead of showing zero",
      () => {
        expect(
          formatMeasurementWithUnit("solar_wind_speed", null)
        ).toBe("—");
      }
    );


    it(
      "maps the backend's factor names",
      () => {
        expect(
          measurementForFactor("planetary_k_index")
        ).toBe("kp");

        expect(
          measurementForFactor("unknown_factor")
        ).toBeNull();
      }
    );
  }
);
