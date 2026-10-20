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
  FORECAST_FIXTURE,
} from "../../test/forecastFixture";


const HOURS = FORECAST_FIXTURE.hourly;


describe(
  "HourlyConditionsTable",
  () => {
    it(
      "renders one row per hour plus the header row",
      () => {
        render(
          <HourlyConditionsTable
            hours={HOURS}
          />
        );

        expect(
          screen.getAllByRole("row")
        ).toHaveLength(
          HOURS.length + 1
        );
      }
    );


    it(
      "labels every column for screen readers",
      () => {
        render(
          <HourlyConditionsTable
            hours={HOURS}
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
      "uses the local hour as the row header",
      () => {
        render(
          <HourlyConditionsTable
            hours={HOURS}
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

        // After midnight the hour still reads as local time.
        expect(
          screen.getByRole(
            "rowheader",
            {
              name: "02:00",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "marks a missing reading instead of showing zero",
      () => {
        render(
          <HourlyConditionsTable
            hours={[
              {
                ...HOURS[0],
                precipitation_probability_percent: null,
              },
            ]}
          />
        );

        expect(
          screen.getByRole(
            "cell",
            {
              name: "—",
            }
          )
        ).toBeInTheDocument();
      }
    );
  }
);
