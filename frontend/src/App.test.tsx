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
  vi,
} from "vitest";

import App from "./App";

import {
  getForecast,
} from "./api/observeApi";

import {
  NAVIGATION_ITEMS,
} from "./layout/navigation";

import {
  FORECAST_FIXTURE,
} from "./test/forecastFixture";


// Routing tests only need each page's layout. Requests that never settle
// keep every data card in its loading state for the length of the test.
// The factories are hoisted above this file's other code, so each one
// builds its own pending promise.
vi.mock(
  "./api/observeApi",
  () => ({
    getForecast: vi.fn(
      () => new Promise(() => {})
    ),
  })
);

vi.mock(
  "./api/spaceWeatherApi",
  () => {
    const pending = () => new Promise(() => {});

    return {
      getCurrentSpaceWeather: vi.fn(pending),
      getCurrentSpaceWeatherRisk: vi.fn(pending),
      getKpTrend: vi.fn(pending),
      getSolarWindTrend: vi.fn(pending),
      getSpaceWeatherAlert: vi.fn(pending),
      listSpaceWeatherAlerts: vi.fn(pending),
    };
  }
);


function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
    >
      <App />
    </MemoryRouter>
  );
}


function getPrimaryNav() {
  return screen.getByRole(
    "navigation",
    {
      name: "Primary",
    }
  );
}


describe(
  "App routing",
  () => {
    it(
      "renders the dashboard at the root path",
      () => {
        renderAt("/");

        expect(
          screen.getByRole(
            "heading",
            {
              level: 1,
              name: "Dashboard",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "links to every planned page",
      () => {
        renderAt("/");

        const navigation = getPrimaryNav();

        for (const item of NAVIGATION_ITEMS) {
          expect(
            within(navigation).getByRole(
              "link",
              {
                name: item.label,
              }
            )
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "moves to another page from the navigation",
      async () => {
        const user = userEvent.setup();

        renderAt("/");

        await user.click(
          within(getPrimaryNav()).getByRole(
            "link",
            {
              name: "Alerts",
            }
          )
        );

        expect(
          await screen.findByRole(
            "heading",
            {
              level: 1,
              name: "Alerts",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "shows a not found page for an unknown route",
      () => {
        renderAt("/not-a-real-page");

        expect(
          screen.getByRole(
            "heading",
            {
              level: 1,
              name: "Page not found",
            }
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "opens the navigation menu on small screens",
      async () => {
        const user = userEvent.setup();

        renderAt("/");

        const toggle = screen.getByRole(
          "button",
          {
            name: "Open menu",
          }
        );

        expect(toggle).toHaveAttribute(
          "aria-expanded",
          "false"
        );

        await user.click(toggle);

        expect(
          screen.getByRole(
            "button",
            {
              name: "Close menu",
            }
          )
        ).toHaveAttribute(
          "aria-expanded",
          "true"
        );
      }
    );


    it(
      "closes the small-screen menu with Escape and returns focus",
      async () => {
        const user = userEvent.setup();

        renderAt("/");

        await user.click(
          screen.getByRole(
            "button",
            {
              name: "Open menu",
            }
          )
        );

        await user.keyboard("{Escape}");

        const toggle = screen.getByRole(
          "button",
          {
            name: "Open menu",
          }
        );

        expect(toggle).toHaveAttribute(
          "aria-expanded",
          "false"
        );

        expect(toggle).toHaveFocus();
      }
    );


    it(
      "starts each new page at the top with focus on its content",
      async () => {
        const user = userEvent.setup();

        const scrollTo = vi.spyOn(
          window,
          "scrollTo"
        );

        // jsdom does not scroll on focus, so assert the option that
        // stops a real browser scrolling <main> under the header.
        const focus = vi.spyOn(
          HTMLElement.prototype,
          "focus"
        );

        renderAt("/");

        expect(scrollTo).not.toHaveBeenCalled();

        await user.click(
          within(getPrimaryNav()).getByRole(
            "link",
            {
              name: "Learn",
            }
          )
        );

        await screen.findByRole(
          "heading",
          {
            level: 1,
            name: "Learn",
          }
        );

        expect(scrollTo).toHaveBeenCalledWith(
          0,
          0
        );

        expect(
          screen.getByRole("main")
        ).toHaveFocus();

        expect(focus).toHaveBeenCalledWith({
          preventScroll: true,
        });

        focus.mockRestore();
      }
    );


    it(
      "returns to the dashboard's city and last results from another page",
      async () => {
        const user = userEvent.setup();

        // Only the first request answers. The refresh on the way back
        // stays pending, so anything on screen then came from the cache.
        vi.mocked(getForecast).mockResolvedValueOnce(
          FORECAST_FIXTURE
        );

        renderAt("/?city=New%20Brunswick");

        await screen.findByText(
          FORECAST_FIXTURE.stargazing.explanation
        );

        await user.click(
          within(getPrimaryNav()).getByRole(
            "link",
            {
              name: "Observe Tonight",
            }
          )
        );

        await screen.findByRole(
          "heading",
          {
            level: 1,
            name: "Observe Tonight",
          }
        );

        const dashboardLink = within(
          getPrimaryNav()
        ).getByRole(
          "link",
          {
            name: "Dashboard",
          }
        );

        expect(dashboardLink).toHaveAttribute(
          "href",
          "/?city=New%20Brunswick"
        );

        expect(
          screen.getByRole(
            "link",
            {
              name: "AstroCast",
            }
          )
        ).toHaveAttribute(
          "href",
          "/?city=New%20Brunswick"
        );

        await user.click(dashboardLink);

        expect(
          screen.getByText(
            FORECAST_FIXTURE.stargazing.explanation
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "textbox",
            {
              name: "City",
            }
          )
        ).toHaveValue("New Brunswick");

        expect(getForecast).toHaveBeenCalledTimes(2);
      }
    );
  }
);
