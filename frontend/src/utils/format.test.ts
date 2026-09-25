import {
  describe,
  expect,
  it,
} from "vitest";

import {
  formatSource,
  formatUtc,
} from "./format";


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
