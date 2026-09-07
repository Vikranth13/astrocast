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

import App from "./App";

import {
  NAVIGATION_ITEMS,
} from "./layout/navigation";


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
  }
);
