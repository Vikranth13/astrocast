import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import ScoreBreakdown from "./ScoreBreakdown";

import {
  FORECAST_FIXTURE,
} from "../../test/forecastFixture";


const FACTORS = FORECAST_FIXTURE.stargazing.factors;


describe(
  "ScoreBreakdown",
  () => {
    it(
      "lists every scoring factor by its label",
      () => {
        render(
          <ScoreBreakdown
            factors={FACTORS}
          />
        );

        for (const factor of FACTORS) {
          expect(
            screen.getByText(
              factor.label
            )
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "shows the measured value and the points it costs",
      () => {
        render(
          <ScoreBreakdown
            factors={FACTORS}
          />
        );

        expect(
          screen.getByText(
            /16 mph, costs 8 points/
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /10 mi, no penalty/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "badges only the factors the backend marks as limiting",
      () => {
        render(
          <ScoreBreakdown
            factors={FACTORS}
          />
        );

        const limitingCount = FACTORS.filter(
          (factor) => factor.is_limiting
        ).length;

        expect(
          screen.getAllByText(
            "Limiting factor"
          )
        ).toHaveLength(limitingCount);
      }
    );


    it(
      "keeps every bar empty on a night with no penalties",
      () => {
        const { container } = render(
          <ScoreBreakdown
            factors={FACTORS.map(
              (factor) => ({
                ...factor,
                penalty: 0,
              })
            )}
          />
        );

        // Dividing by a largest penalty of zero would give NaN, which
        // the browser drops as an invalid width.
        const fills = container.querySelectorAll<HTMLElement>(
          ".ui-meter-fill"
        );

        expect(fills).toHaveLength(FACTORS.length);

        for (const fill of fills) {
          expect(fill.style.width).toBe("0%");
        }
      }
    );
  }
);
