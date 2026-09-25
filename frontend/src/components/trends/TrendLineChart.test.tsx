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

import TrendLineChart from "./TrendLineChart";


const POINTS_WITH_GAP = [
  {
    observed_at: "2026-09-06T18:00:00Z",
    value: 4.0,
  },

  {
    observed_at: "2026-09-06T19:00:00Z",
    value: null,
  },

  {
    observed_at: "2026-09-06T20:00:00Z",
    value: 6.5,
  },
];


describe(
  "TrendLineChart",
  () => {
    it(
      "summarises the series in text, counting the gap",
      () => {
        render(
          <TrendLineChart
            title="Solar wind density"
            points={POINTS_WITH_GAP}
            unit="per cm³"
          />
        );

        expect(
          screen.getByText(
            "Latest 6.5 per cm³ at 2026-09-06 20:00 UTC. "
            + "Ranged from 4 to 6.5 per cm³ across "
            + "2 readings, with 1 missing."
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "gives the chart a text alternative",
      () => {
        render(
          <TrendLineChart
            title="Solar wind density"
            points={POINTS_WITH_GAP}
            unit="per cm³"
          />
        );

        expect(
          screen.getByRole("img")
        ).toHaveAccessibleName(
          /^Solar wind density\. Latest 6\.5/
        );
      }
    );


    it(
      "lists every reading in the data table, marking the gap",
      () => {
        render(
          <TrendLineChart
            title="Solar wind density"
            points={POINTS_WITH_GAP}
            unit="per cm³"
          />
        );

        const table = screen.getByRole(
          "table",
          {
            name: "Solar wind density readings",
            hidden: true,
          }
        );

        const missingRow = within(table).getByRole(
          "row",
          {
            name: /2026-09-06 19:00 UTC/,
            hidden: true,
          }
        );

        expect(
          within(missingRow).getByText("—")
        ).toBeInTheDocument();

        expect(
          within(table).getAllByRole(
            "row",
            {
              hidden: true,
            }
          )
        ).toHaveLength(
          POINTS_WITH_GAP.length + 1
        );
      }
    );


    it(
      "says so when nothing was measured",
      () => {
        render(
          <TrendLineChart
            title="Solar wind speed"
            points={[
              {
                observed_at: "2026-09-06T18:00:00Z",
                value: null,
              },
            ]}
            unit="km/s"
          />
        );

        expect(
          screen.getByText(
            "No measurements were stored for this period."
          )
        ).toBeInTheDocument();
      }
    );
  }
);
