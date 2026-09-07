import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import Dashboard from "./Dashboard";


describe(
  "Dashboard",
  () => {
    it(
      "groups the cards into titled sections",
      () => {
        render(<Dashboard />);

        for (const title of [
          "Tonight",
          "Sky and space weather",
          "Recent movement",
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
      "shows the observing status and its limiting factor",
      () => {
        render(<Dashboard />);

        expect(
          screen.getByText("74")
        ).toBeInTheDocument();

        expect(
          screen.getByText("Good")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /Limiting factor: Moonlight/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "shows geomagnetic badges driven by the tone mapping",
      () => {
        render(<Dashboard />);

        expect(
          screen.getByText("Kp 5.33")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Minor geomagnetic storm"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("moderate risk")
        ).toHaveClass(
          "ui-badge-caution"
        );
      }
    );


    it(
      "shows the latest alert with its NOAA scale code",
      () => {
        render(<Dashboard />);

        expect(
          screen.getByText("warning")
        ).toBeInTheDocument();

        expect(
          screen.getByText("active")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /Geomagnetic K-index of 5 expected/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "shows a mini trend for each stored metric",
      () => {
        render(<Dashboard />);

        expect(
          screen.getByText("Planetary Kp")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Solar wind speed"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "up 1.66 over 24 hours"
          )
        ).toBeInTheDocument();
      }
    );
  }
);
