import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import PageState from "./PageState";


describe(
  "PageState",
  () => {
    it(
      "delegates the loading status to a live region",
      () => {
        render(
          <PageState
            status="loading"
            loadingMessage="Loading alerts..."
          />
        );

        expect(
          screen.getByRole("status")
        ).toHaveTextContent(
          "Loading alerts..."
        );
      }
    );


    it(
      "delegates the error status to an alert",
      () => {
        render(
          <PageState
            status="error"
            errorMessage="NOAA data is unavailable."
          />
        );

        expect(
          screen.getByRole("alert")
        ).toHaveTextContent(
          "NOAA data is unavailable."
        );
      }
    );


    it(
      "shows the empty message without a live region",
      () => {
        render(
          <PageState
            status="empty"
            emptyMessage="No alerts are active."
          />
        );

        expect(
          screen.getByText(
            "No alerts are active."
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByRole("status")
        ).not.toBeInTheDocument();
      }
    );


    it(
      "renders children once the status is ready",
      () => {
        render(
          <PageState status="ready">
            <p>Kp 1.67</p>
          </PageState>
        );

        expect(
          screen.getByText("Kp 1.67")
        ).toBeInTheDocument();
      }
    );
  }
);
