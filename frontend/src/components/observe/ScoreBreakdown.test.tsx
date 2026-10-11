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
  MOCK_OBSERVE_TONIGHT,
} from "../../data/mockObserveTonight";


describe(
  "ScoreBreakdown",
  () => {
    it(
      "lists every scoring factor",
      () => {
        render(
          <ScoreBreakdown
            factors={
              MOCK_OBSERVE_TONIGHT.factors
            }
          />
        );

        for (const factor of MOCK_OBSERVE_TONIGHT.factors) {
          expect(
            screen.getByText(
              factor.factor
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
            factors={
              MOCK_OBSERVE_TONIGHT.factors
            }
          />
        );

        expect(
          screen.getByText(
            /35%, costs 24\.5 points/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "badges only the limiting factors",
      () => {
        render(
          <ScoreBreakdown
            factors={
              MOCK_OBSERVE_TONIGHT.factors
            }
          />
        );

        const limitingCount =
          MOCK_OBSERVE_TONIGHT.factors.filter(
            (factor) => factor.isLimiting
          ).length;

        expect(
          screen.getAllByText(
            "Limiting factor"
          )
        ).toHaveLength(limitingCount);
      }
    );
  }
);
