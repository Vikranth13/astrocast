import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ForecastSnapshotSummary,
} from "../../api/types/observe";

import {
  describeChange,
} from "./forecastHistory";


function check(
  retrievedAt: string,
  forecastTime: string,
  score: number
): ForecastSnapshotSummary {
  return {
    retrieved_at: retrievedAt,
    forecast_time: forecastTime,
    score,
    rating: "Good",
    limiting_factor: null,
    best_window_first_hour: null,
    best_window_last_hour: null,
    best_window_qualifies: null,
  };
}


// Newest first, as the history endpoint returns them.
const CHECKS = [
  check("2026-10-19T21:05:00Z", "2026-10-19T22:00", 76),
  check("2026-10-19T18:30:00Z", "2026-10-19T22:00", 69),
  check("2026-10-18T20:00:00Z", "2026-10-18T22:00", 81),
  check("2026-10-18T17:00:00Z", "2026-10-18T22:00", 81),
];


describe(
  "describeChange",
  () => {
    it(
      "compares with the previous check of the same night",
      () => {
        expect(
          describeChange(CHECKS, 0)
        ).toBe("+7 since the previous check");
      }
    );


    it(
      "never compares checks of different nights",
      () => {
        // The next older check is for the night before.
        expect(
          describeChange(CHECKS, 1)
        ).toBeNull();
      }
    );


    it(
      "says when nothing changed",
      () => {
        expect(
          describeChange(CHECKS, 2)
        ).toBe("unchanged since the previous check");
      }
    );


    it(
      "uses a real minus sign for a fall",
      () => {
        expect(
          describeChange(
            [
              check("2026-10-19T21:05:00Z", "2026-10-19T22:00", 60),
              check("2026-10-19T18:30:00Z", "2026-10-19T22:00", 72),
            ],
            0
          )
        ).toBe("−12 since the previous check");
      }
    );


    it(
      "has nothing to say about the oldest check",
      () => {
        expect(
          describeChange(CHECKS, 3)
        ).toBeNull();
      }
    );
  }
);
