import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import DataFreshness from "./DataFreshness";


describe(
  "DataFreshness",
  () => {
    it(
      "shows the status and the age in minutes",
      () => {
        render(
          <DataFreshness
            status="current"
            ageMinutes={45}
          />
        );

        expect(
          screen.getByText("current")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "45 minutes old"
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "shows whole hours without minutes",
      () => {
        render(
          <DataFreshness
            status="delayed"
            ageMinutes={180}
          />
        );

        expect(
          screen.getByText("3 hours old")
        ).toBeInTheDocument();
      }
    );


    it(
      "shows hours and minutes together",
      () => {
        render(
          <DataFreshness
            status="stale"
            ageMinutes={195}
          />
        );

        expect(
          screen.getByText("3h 15m old")
        ).toBeInTheDocument();
      }
    );
  }
);
