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

import {
  buildChartData,
  dayTicksBetween,
} from "./chartData";


const WINDOW = {
  windowStart: "2026-09-06T00:00:00Z",
  windowEnd: "2026-09-07T00:00:00Z",
  windowLabel: "Past day",
};

// Hourly averages with one empty hour, as the backend sends them.
const HOURLY_WITH_EMPTY_HOUR = [
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

const HOURS = {
  one: "hour",
  many: "hours",
};

const HOURLY_AVERAGES = {
  one: "hourly average",
  many: "hourly averages",
};


describe(
  "TrendLineChart",
  () => {
    it(
      "summarises the window and the series in text",
      () => {
        render(
          <TrendLineChart
            title="Solar wind density"
            points={HOURLY_WITH_EMPTY_HOUR}
            measurement="solar_wind_density"
            readings={HOURLY_AVERAGES}
            slots={HOURS}
            {...WINDOW}
          />
        );

        expect(
          screen.getByText(
            "Past day, 2026-09-06 00:00 UTC to 2026-09-07 00:00 UTC. "
            + "Latest 6.5 per cm³ at 2026-09-06 20:00 UTC. "
            + "Ranged from 4.0 to 6.5 per cm³ across "
            + "2 hourly averages. 1 hour has no stored reading."
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
            points={HOURLY_WITH_EMPTY_HOUR}
            measurement="solar_wind_density"
            {...WINDOW}
          />
        );

        expect(
          screen.getByRole("img")
        ).toHaveAccessibleName(
          /^Solar wind density\. Past day, 2026-09-06 00:00 UTC/
        );
      }
    );


    it(
      "lists every slot in the data table, marking the empty one",
      () => {
        render(
          <TrendLineChart
            title="Solar wind density"
            points={HOURLY_WITH_EMPTY_HOUR}
            measurement="solar_wind_density"
            {...WINDOW}
          />
        );

        const table = screen.getByRole(
          "table",
          {
            name: "Solar wind density readings",
            hidden: true,
          }
        );

        const emptyRow = within(table).getByRole(
          "row",
          {
            name: /2026-09-06 19:00 UTC/,
            hidden: true,
          }
        );

        expect(
          within(emptyRow).getByText("—")
        ).toBeInTheDocument();

        expect(
          within(table).getAllByRole(
            "row",
            {
              hidden: true,
            }
          )
        ).toHaveLength(
          HOURLY_WITH_EMPTY_HOUR.length + 1
        );
      }
    );


    it(
      "names the gaps it will not draw across",
      () => {
        render(
          <TrendLineChart
            title="Planetary K-index"
            points={[
              {
                observed_at: "2026-09-06T00:00:00Z",
                value: 2,
              },
              {
                observed_at: "2026-09-06T03:00:00Z",
                value: 3,
              },
              {
                observed_at: "2026-09-06T15:00:00Z",
                value: 2.33,
              },
            ]}
            measurement="kp"
            maxGapMinutes={180}
            {...WINDOW}
          />
        );

        expect(
          screen.getByText(
            /The line breaks at 1 gap with no stored reading\.$/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "says so when nothing was stored in the window",
      () => {
        render(
          <TrendLineChart
            title="Solar wind speed"
            points={[]}
            measurement="solar_wind_speed"
            {...WINDOW}
          />
        );

        expect(
          screen.getByText(
            "Past day, 2026-09-06 00:00 UTC to 2026-09-07 00:00 UTC. "
            + "No readings were stored in this window."
          )
        ).toBeInTheDocument();
      }
    );
  }
);


describe(
  "buildChartData",
  () => {
    it(
      "puts an empty point inside a gap so the line breaks",
      () => {
        const data = buildChartData(
          [
            {
              observed_at: "2026-09-06T00:00:00Z",
              value: 2,
            },
            {
              observed_at: "2026-09-06T03:00:00Z",
              value: 3,
            },
            {
              observed_at: "2026-09-06T12:00:00Z",
              value: 4,
            },
          ],
          180
        );

        expect(
          data.map((datum) => datum.value)
        ).toEqual([2, 3, null, 4]);
      }
    );


    it(
      "joins readings that arrive on schedule",
      () => {
        const data = buildChartData(
          [
            {
              observed_at: "2026-09-06T00:00:00Z",
              value: 2,
            },
            {
              observed_at: "2026-09-06T03:00:00Z",
              value: 3,
            },
          ],
          180
        );

        expect(data).toHaveLength(2);
      }
    );
  }
);


describe(
  "dayTicksBetween",
  () => {
    it(
      "marks each UTC midnight inside the window",
      () => {
        expect(
          dayTicksBetween(
            Date.parse("2026-09-05T12:00:00Z"),
            Date.parse("2026-09-07T06:00:00Z")
          ).map((tick) => new Date(tick).toISOString())
        ).toEqual([
          "2026-09-06T00:00:00.000Z",
          "2026-09-07T00:00:00.000Z",
        ]);
      }
    );
  }
);
