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
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import App from "../App";

import {
  ApiRequestError,
} from "../api/client";

import {
  getSpaceWeatherAlert,
  listSpaceWeatherAlerts,
  type AlertQuery,
} from "../api/spaceWeatherApi";

import type {
  SpaceWeatherAlertDetailResponse,
  SpaceWeatherAlertListResponse,
} from "../api/types/spaceWeather";

import {
  MOCK_ALERTS,
} from "../data/mockSpaceWeather";


vi.mock(
  "../api/spaceWeatherApi",
  () => ({
    getCurrentSpaceWeather: vi.fn(),
    getCurrentSpaceWeatherRisk: vi.fn(),
    getKpTrend: vi.fn(),
    getSolarWindTrend: vi.fn(),
    getSpaceWeatherAlert: vi.fn(),
    listSpaceWeatherAlerts: vi.fn(),
  })
);


const mockedListAlerts = vi.mocked(listSpaceWeatherAlerts);
const mockedGetAlert = vi.mocked(getSpaceWeatherAlert);


// Enough stored alerts for three pages of 25, newest first.
const MANY_ALERTS: SpaceWeatherAlertDetailResponse[] = Array.from(
  { length: 60 },
  (_, index) => ({
    ...MOCK_ALERTS[0],
    id: 100 - index,
    summary: `Stored alert ${100 - index}`,
  })
);


// Answers the way the backend would: one page cut from the given alerts,
// with the total across every page.
function serve(
  alerts: SpaceWeatherAlertDetailResponse[]
) {
  mockedListAlerts.mockImplementation(
    async (query: AlertQuery = {}) => {
      const offset = query.offset ?? 0;
      const limit = query.limit ?? 100;

      const page = alerts.slice(
        offset,
        offset + limit
      );

      const response: SpaceWeatherAlertListResponse = {
        count: page.length,
        total: alerts.length,
        offset,
        alerts: page,
      };

      return response;
    }
  );
}


function lastQuery(): AlertQuery {
  const calls = mockedListAlerts.mock.calls;

  return calls[calls.length - 1]?.[0] ?? {};
}


function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
    >
      <App />
    </MemoryRouter>
  );
}


beforeEach(() => {
  vi.resetAllMocks();

  serve(MOCK_ALERTS);

  mockedGetAlert.mockImplementation(
    async (alertId: number) => {
      const alert = MOCK_ALERTS.find(
        (candidate) => candidate.id === alertId
      );

      if (!alert) {
        throw new ApiRequestError({
          message: "Space-weather alert was not found.",
          status: 404,
          code: "not_found",
        });
      }

      return alert;
    }
  );
});


describe(
  "Alerts page",
  () => {
    it(
      "asks the backend for the first page with no filters",
      async () => {
        renderAt("/alerts");

        expect(
          await screen.findByText(
            "Showing 1–7 of 7 alerts"
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

        expect(lastQuery()).toEqual({
          severity: null,
          type: null,
          status: null,
          limit: 25,
          offset: 0,
        });
      }
    );


    it(
      "forwards the filters in the address to the backend",
      async () => {
        renderAt(
          "/alerts?severity=G1&status=expired"
        );

        await screen.findByText(/Showing/);

        expect(
          screen.getByLabelText("Severity")
        ).toHaveValue("G1");

        expect(lastQuery()).toMatchObject({
          severity: "G1",
          status: "expired",
        });
      }
    );


    it(
      "drops a filter value the backend would reject",
      async () => {
        renderAt(
          "/alerts?severity=Z9"
        );

        await screen.findByText(/Showing/);

        expect(
          screen.getByLabelText("Severity")
        ).toHaveValue("");

        expect(lastQuery().severity).toBeNull();
      }
    );


    it(
      "starts a new filter from the first page",
      async () => {
        const user = userEvent.setup();

        serve(MANY_ALERTS);

        renderAt("/alerts?page=3");

        await screen.findByText(
          "Showing 51–60 of 60 alerts"
        );

        await user.selectOptions(
          screen.getByLabelText("Status"),
          "expired"
        );

        await screen.findByText(
          "Showing 1–25 of 60 alerts"
        );

        expect(lastQuery()).toMatchObject({
          status: "expired",
          offset: 0,
        });
      }
    );


    it(
      "pages through results with links that keep the filters",
      async () => {
        const user = userEvent.setup();

        serve(MANY_ALERTS);

        renderAt("/alerts?status=expired");

        expect(
          await screen.findByText(
            "Showing 1–25 of 60 alerts"
          )
        ).toBeInTheDocument();

        const pager = screen.getByRole(
          "navigation",
          {
            name: "Alert pages",
          }
        );

        expect(
          within(pager).getByText("Page 1 of 3")
        ).toBeInTheDocument();

        expect(
          within(pager).queryByRole(
            "link",
            {
              name: "Previous",
            }
          )
        ).not.toBeInTheDocument();

        const next = within(pager).getByRole(
          "link",
          {
            name: "Next",
          }
        );

        expect(next).toHaveAttribute(
          "href",
          "/alerts?status=expired&page=2"
        );

        await user.click(next);

        expect(
          await screen.findByText(
            "Showing 26–50 of 60 alerts"
          )
        ).toBeInTheDocument();

        expect(lastQuery()).toMatchObject({
          status: "expired",
          offset: 25,
        });

        expect(
          screen.getByRole(
            "link",
            {
              name: "Previous",
            }
          )
        ).toHaveAttribute(
          "href",
          "/alerts?status=expired"
        );
      }
    );


    it(
      "hides the pager when everything fits on one page",
      async () => {
        renderAt("/alerts");

        await screen.findByText(
          "Showing 1–7 of 7 alerts"
        );

        expect(
          screen.queryByRole(
            "navigation",
            {
              name: "Alert pages",
            }
          )
        ).not.toBeInTheDocument();
      }
    );


    it(
      "says when no alerts have been stored at all",
      async () => {
        serve([]);

        renderAt("/alerts");

        expect(
          await screen.findByText(
            "No NOAA alerts have been stored yet. Run alert ingestion to fetch them."
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "says when nothing matches and offers a way out",
      async () => {
        const user = userEvent.setup();

        serve([]);

        renderAt("/alerts?severity=G5");

        expect(
          await screen.findByText(
            "No alerts match these filters."
          )
        ).toBeInTheDocument();

        serve(MOCK_ALERTS);

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Clear filters",
            }
          )
        );

        expect(
          await screen.findByText(
            "Showing 1–7 of 7 alerts"
          )
        ).toBeInTheDocument();

        expect(lastQuery().severity).toBeNull();
      }
    );


    it(
      "points a page past the end back to the last real page",
      async () => {
        serve(MANY_ALERTS);

        renderAt("/alerts?page=9");

        expect(
          await screen.findByText(
            "Page 9 is past the last page of results."
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "link",
            {
              name: "Go to page 3",
            }
          )
        ).toHaveAttribute(
          "href",
          "/alerts?page=3"
        );
      }
    );


    it(
      "keeps the filters usable when the list fails to load",
      async () => {
        mockedListAlerts.mockRejectedValue(
          new Error(
            "The AstroCast server could not be reached. Check that the backend is running, then try again."
          )
        );

        renderAt("/alerts?status=expired");

        expect(
          await screen.findByText(
            /could not be reached/
          )
        ).toBeInTheDocument();

        expect(
          screen.getByLabelText("Status")
        ).toHaveValue("expired");
      }
    );


    it(
      "labels an expired alert's end time in the past tense",
      async () => {
        renderAt("/alerts?status=expired");

        await screen.findByText(/Showing/);

        const expiredItem = screen
          .getByRole(
            "link",
            {
              name: "X-ray flux exceeded M1",
            }
          )
          .closest("li");

        expect(expiredItem).not.toBeNull();

        // The status badge also reads "Expired", so look at the label
        // on the time itself.
        expect(
          within(expiredItem as HTMLElement).getByText(
            "Expired",
            {
              selector: "dt",
            }
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
          await screen.findByRole(
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

        expect(mockedGetAlert).toHaveBeenCalledWith(7);

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
      async () => {
        renderAt("/alerts/6");

        expect(
          await screen.findByText("Not given")
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
      "says plainly that an expired alert no longer applies",
      async () => {
        renderAt("/alerts/4");

        expect(
          await screen.findByText(
            /This alert expired on 2026-09-05 15:00 UTC\. It\s+describes conditions that no longer apply\./
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Expired",
            {
              selector: "dt",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "does not show the expired notice on an active alert",
      async () => {
        renderAt("/alerts/7");

        await screen.findByRole(
          "heading",
          {
            level: 1,
            name: "Geomagnetic K-index of 5 expected",
          }
        );

        expect(
          screen.queryByText(/This alert expired/)
        ).not.toBeInTheDocument();
      }
    );


    it(
      "reports an ID the backend does not have",
      async () => {
        renderAt("/alerts/999");

        expect(
          await screen.findByRole(
            "heading",
            {
              level: 1,
              name: "Alert not found",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "rejects an ID that cannot exist without asking the backend",
      () => {
        renderAt("/alerts/abc");

        expect(
          screen.getByRole(
            "heading",
            {
              level: 1,
              name: "Alert not found",
            }
          )
        ).toBeInTheDocument();

        expect(mockedGetAlert).not.toHaveBeenCalled();
      }
    );


    it(
      "tells an unreachable server apart from a missing alert",
      async () => {
        mockedGetAlert.mockRejectedValue(
          new ApiRequestError({
            message: "The AstroCast server could not be reached. Check that the backend is running, then try again.",
            status: null,
            code: "network_error",
          })
        );

        renderAt("/alerts/7");

        expect(
          await screen.findByText(
            /could not be reached/
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            "heading",
            {
              name: "Alert not found",
            }
          )
        ).not.toBeInTheDocument();
      }
    );
  }
);
