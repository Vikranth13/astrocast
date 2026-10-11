import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import HourlyConditionsTable from "./HourlyConditionsTable";

import {
  MOCK_OBSERVE_TONIGHT,
} from "../../data/mockObserveTonight";


describe(
  "HourlyConditionsTable",
  () => {
    it(
      "renders one row per hour plus the header row",
      () => {
        render(
          <HourlyConditionsTable
            hours={
              MOCK_OBSERVE_TONIGHT.hours
            }
          />
        );

        expect(
          screen.getAllByRole("row")
        ).toHaveLength(
          MOCK_OBSERVE_TONIGHT.hours
            .length + 1
        );
      }
    );


    it(
      "labels every column for screen readers",
      () => {
        render(
          <HourlyConditionsTable
            hours={
              MOCK_OBSERVE_TONIGHT.hours
            }
          />
        );

        for (const column of [
          "Hour",
          "Cloud",
          "Rain",
          "Wind",
          "Visibility",
          "Score",
        ]) {
          expect(
            screen.getByRole(
              "columnheader",
              {
                name: column,
              }
            )
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "uses the hour as the row header",
      () => {
        render(
          <HourlyConditionsTable
            hours={
              MOCK_OBSERVE_TONIGHT.hours
            }
          />
        );

        expect(
          screen.getByRole(
            "rowheader",
            {
              name: "22:00",
            }
          )
        ).toBeInTheDocument();
      }
    );
  }
);
