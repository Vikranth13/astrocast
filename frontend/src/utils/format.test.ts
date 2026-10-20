import {
  describe,
  expect,
  it,
} from "vitest";

import {
  formatLocalHour,
  formatMeasurement,
  formatSource,
  formatUtc,
  formatUtcDay,
} from "./format";


describe(
  "formatMeasurement",
  () => {
    it(
      "attaches a percent sign and spaces other units",
      () => {
        expect(
          formatMeasurement(35, "%")
        ).toBe("35%");

        expect(
          formatMeasurement(18, "mph")
        ).toBe("18 mph");
      }
    );


    it(
      "marks a missing reading instead of showing zero",
      () => {
        expect(
          formatMeasurement(null, "%")
        ).toBe("—");
      }
    );
  }
);


describe(
  "formatLocalHour",
  () => {
    it(
      "reads the hour without shifting time zones",
      () => {
        expect(
          formatLocalHour(
            "2026-10-19T22:00"
          )
        ).toBe("22:00");

        expect(
          formatLocalHour(
            "2026-10-20T03:00"
          )
        ).toBe("03:00");
      }
    );


    it(
      "returns unrecognised input unchanged",
      () => {
        expect(
          formatLocalHour("tonight")
        ).toBe("tonight");
      }
    );
  }
);


describe(
  "formatUtcDay",
  () => {
    it(
      "labels the UTC calendar day",
      () => {
        expect(
          formatUtcDay(
            "2026-09-06T21:40:00Z"
          )
        ).toBe("Sep 6");

        expect(
          formatUtcDay(
            "2026-08-31T00:00:00.000Z"
          )
        ).toBe("Aug 31");
      }
    );
  }
);


describe(
  "formatUtc",
  () => {
    it(
      "matches the backend explanation format",
      () => {
        expect(
          formatUtc(
            "2026-09-06T21:40:00Z"
          )
        ).toBe(
          "2026-09-06 21:40 UTC"
        );
      }
    );


    it(
      "converts offset timestamps to UTC",
      () => {
        expect(
          formatUtc(
            "2026-09-06T23:40:00+02:00"
          )
        ).toBe(
          "2026-09-06 21:40 UTC"
        );
      }
    );


    it(
      "returns unparseable input unchanged",
      () => {
        expect(
          formatUtc("not-a-date")
        ).toBe("not-a-date");
      }
    );
  }
);


describe(
  "formatSource",
  () => {
    it(
      "labels known sources and passes others through",
      () => {
        expect(
          formatSource("NOAA_SWPC")
        ).toBe("NOAA SWPC");

        expect(
          formatSource("OTHER")
        ).toBe("OTHER");
      }
    );
  }
);
