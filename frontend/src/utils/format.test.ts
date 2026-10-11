import {
  describe,
  expect,
  it,
} from "vitest";

import {
  formatSource,
  formatUtc,
  formatUtcDay,
} from "./format";


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
