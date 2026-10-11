import {
  render,
  screen,
} from "@testing-library/react";

import {
  MemoryRouter,
} from "react-router";

import {
  describe,
  expect,
  it,
} from "vitest";

import Dashboard from "./Dashboard";


function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}


describe(
  "Dashboard",
  () => {
    it(
      "groups the cards into titled sections",
      () => {
        renderDashboard();

        for (const title of [
          "Tonight",
          "Sky and space weather",
          "Recent movement",
        ]) {
          expect(
            screen.getByRole(
              "region",
              {
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
        renderDashboard();

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
        renderDashboard();

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
      "links the latest alert to its detail page",
      () => {
        renderDashboard();

        expect(
          screen.getByRole(
            "link",
            {
              name: "Geomagnetic K-index of 5 expected",
            }
          )
        ).toHaveAttribute(
          "href",
          "/alerts/7"
        );

        expect(
          screen.getByText("Warning")
        ).toBeInTheDocument();

        expect(
          screen.getByText("Active")
        ).toBeInTheDocument();
      }
    );


    it(
      "derives each 24-hour change from the shared week of data",
      () => {
        renderDashboard();

        expect(
          screen.getByText(
            "up 3.00 over 24 hours"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "up 180 over 24 hours"
          )
        ).toBeInTheDocument();
      }
    );
  }
);
