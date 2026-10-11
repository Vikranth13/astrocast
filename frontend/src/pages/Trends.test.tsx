import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import Trends from "./Trends";


describe(
  "Trends",
  () => {
    it(
      "charts each stored metric",
      () => {
        render(<Trends />);

        for (const title of [
          "Planetary K-index",
          "Solar wind speed",
          "Solar wind density",
        ]) {
          expect(
            screen.getByRole(
              "heading",
              {
                level: 2,
                name: title,
              }
            )
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "ends on the same reading as the rest of the app",
      () => {
        render(<Trends />);

        expect(
          screen.getByText(
            /^Latest 5\.33 at 2026-09-06 21:00 UTC\./
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /^Latest 612 km\/s at 2026-09-06 21:00 UTC\./
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "reports the missing solar wind reading on both solar wind charts",
      () => {
        render(<Trends />);

        expect(
          screen.getAllByText(
            /across 55 readings, with 1 missing\.$/,
            {
              selector: "figcaption",
            }
          )
        ).toHaveLength(2);
      }
    );


    it(
      "states the source and what a gap means",
      () => {
        render(<Trends />);

        expect(
          screen.getByText(
            /A gap in a line means no measurement was stored/
          )
        ).toBeInTheDocument();
      }
    );
  }
);
