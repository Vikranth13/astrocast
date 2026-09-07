import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import MetricCard from "./MetricCard";


describe(
  "MetricCard",
  () => {
    it(
      "shows the label, value, unit, and footnote",
      () => {
        render(
          <MetricCard
            label="Planetary Kp"
            value={1.67}
            unit="index"
            footnote="Observed 15:00 UTC"
          />
        );

        expect(
          screen.getByText("Planetary Kp")
        ).toBeInTheDocument();

        expect(
          screen.getByText("1.67")
        ).toBeInTheDocument();

        expect(
          screen.getByText("index")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Observed 15:00 UTC"
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "shows a dash when the value is missing",
      () => {
        render(
          <MetricCard
            label="Running a-index"
            value={null}
            unit="index"
          />
        );

        expect(
          screen.getByText("—")
        ).toBeInTheDocument();

        expect(
          screen.queryByText("index")
        ).not.toBeInTheDocument();
      }
    );


    it(
      "treats zero as a real value",
      () => {
        render(
          <MetricCard
            label="Station count"
            value={0}
          />
        );

        expect(
          screen.getByText("0")
        ).toBeInTheDocument();

        expect(
          screen.queryByText("—")
        ).not.toBeInTheDocument();
      }
    );
  }
);
