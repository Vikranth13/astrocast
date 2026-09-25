import {
  render,
  screen,
  within,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import SpaceWeather from "./SpaceWeather";


describe(
  "SpaceWeather",
  () => {
    it(
      "shows the current measurements and their freshness",
      () => {
        render(<SpaceWeather />);

        expect(
          screen.getByText("5.33")
        ).toBeInTheDocument();

        expect(
          screen.getByText("G1")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Observed 2026-09-06 21:00 UTC"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("current")
        ).toBeInTheDocument();
      }
    );


    it(
      "shows the risk level and the rules that produced it",
      () => {
        render(<SpaceWeather />);

        expect(
          screen.getByText("moderate")
        ).toHaveClass(
          "ui-badge-caution"
        );

        expect(
          screen.getByText("KP_G1_G2")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "SW_SPEED_ELEVATED"
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "always carries the aurora caveat",
      () => {
        render(<SpaceWeather />);

        const caveats = screen.getByRole(
          "note",
          {
            name: "Limits of this data",
          }
        );

        expect(
          within(caveats).getByText(
            /does not establish whether aurora will be visible/
          )
        ).toBeInTheDocument();
      }
    );
  }
);
