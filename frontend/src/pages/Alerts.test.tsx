import {
  render,
  screen,
  within,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import {
  MemoryRouter,
} from "react-router";

import {
  describe,
  expect,
  it,
} from "vitest";

import App from "../App";


function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
    >
      <App />
    </MemoryRouter>
  );
}


describe(
  "Alerts page",
  () => {
    it(
      "lists every alert when no filter is set",
      () => {
        renderAt("/alerts");

        expect(
          screen.getByText(
            "Showing 7 of 7 alerts"
          )
        ).toBeInTheDocument();

        expect(
          within(
            screen.getByRole(
              "list",
              {
                name: "Alerts",
              }
            )
          ).getAllByRole("listitem")
        ).toHaveLength(7);
      }
    );


    it(
      "narrows the list when a filter is chosen",
      async () => {
        const user = userEvent.setup();

        renderAt("/alerts");

        await user.selectOptions(
          screen.getByLabelText("Status"),
          "expired"
        );

        expect(
          screen.getByText(
            "Showing 3 of 7 alerts"
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "applies filters already in the URL",
      () => {
        renderAt(
          "/alerts?severity=G1"
        );

        expect(
          screen.getByLabelText("Severity")
        ).toHaveValue("G1");

        expect(
          screen.getByText(
            "Showing 2 of 7 alerts"
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "ignores a filter value the backend would reject",
      () => {
        renderAt(
          "/alerts?severity=Z9"
        );

        expect(
          screen.getByLabelText("Severity")
        ).toHaveValue("");

        expect(
          screen.getByText(
            "Showing 7 of 7 alerts"
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "shows an empty state and a way out when nothing matches",
      async () => {
        const user = userEvent.setup();

        renderAt(
          "/alerts?severity=G5"
        );

        expect(
          screen.getByText(
            "No alerts match these filters."
          )
        ).toBeInTheDocument();

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Clear filters",
            }
          )
        );

        expect(
          screen.getByText(
            "Showing 7 of 7 alerts"
          )
        ).toBeInTheDocument();
      }
    );
  }
);


describe(
  "Alert detail page",
  () => {
    it(
      "opens from the list with source, times, and caveats",
      async () => {
        const user = userEvent.setup();

        renderAt("/alerts");

        await user.click(
          screen.getByRole(
            "link",
            {
              name: "Geomagnetic K-index of 5 expected",
            }
          )
        );

        expect(
          await screen.findByRole(
            "heading",
            {
              level: 1,
              name: "Geomagnetic K-index of 5 expected",
            }
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("NOAA SWPC")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "2026-09-06 21:40 UTC"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "2026-09-07 06:00 UTC"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "note",
            {
              name: "Limits of this data",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "is honest about an alert NOAA sent without an expiry",
      () => {
        renderAt("/alerts/6");

        expect(
          screen.getByText("Not given")
        ).toBeInTheDocument();

        expect(
          within(
            screen.getByRole(
              "note",
              {
                name: "Limits of this data",
              }
            )
          ).getByText(
            /NOAA did not supply an expiration time/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "reports an unknown alert ID",
      () => {
        renderAt("/alerts/999");

        expect(
          screen.getByRole(
            "heading",
            {
              level: 1,
              name: "Alert not found",
            }
          )
        ).toBeInTheDocument();
      }
    );
  }
);
