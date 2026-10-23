import {
  render,
  screen,
  within,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import SpaceWeather from "./SpaceWeather";

import {
  getCurrentSpaceWeather,
  getCurrentSpaceWeatherRisk,
} from "../api/spaceWeatherApi";

import {
  MOCK_CURRENT_CONDITIONS,
  MOCK_RISK,
} from "../test/spaceWeatherFixtures";


vi.mock(
  "../api/spaceWeatherApi",
  () => ({
    getCurrentSpaceWeather: vi.fn(),
    getCurrentSpaceWeatherRisk: vi.fn(),
  })
);


const mockedGetCurrent = vi.mocked(getCurrentSpaceWeather);
const mockedGetRisk = vi.mocked(getCurrentSpaceWeatherRisk);

const UNREACHABLE =
  "The AstroCast server could not be reached. Check that the backend is running, then try again.";


describe(
  "SpaceWeather",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();

      mockedGetCurrent.mockResolvedValue(
        MOCK_CURRENT_CONDITIONS
      );

      mockedGetRisk.mockResolvedValue(
        MOCK_RISK
      );
    });


    it(
      "shows the current measurements and their freshness",
      async () => {
        render(<SpaceWeather />);

        // The risk card lists Kp as a factor too, so look in the
        // current conditions section.
        const currentConditions = screen.getByRole(
          "region",
          {
            name: "Current conditions",
          }
        );

        expect(
          await within(currentConditions).findByText("5.33")
        ).toBeInTheDocument();

        expect(
          within(currentConditions).getByText("G1")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Observed 2026-09-06 21:00 UTC"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText("current")
        ).toBeInTheDocument();
      }
    );


    it(
      "shows the solar wind readings the risk assessment used",
      async () => {
        render(<SpaceWeather />);

        expect(
          await screen.findByText("612")
        ).toBeInTheDocument();

        expect(
          screen.getByText("8.4")
        ).toBeInTheDocument();

        expect(
          screen.getAllByText(
            "Observed 2026-09-06 21:40 UTC"
          )
        ).toHaveLength(2);
      }
    );


    it(
      "shows the risk level and the rules that produced it",
      async () => {
        render(<SpaceWeather />);

        expect(
          await screen.findByText("moderate")
        ).toHaveClass(
          "ui-badge-caution"
        );

        expect(
          screen.getByText("KP_G1_G2")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "SW_SPEED_ELEVATED"
          )
        ).toBeInTheDocument();

        // Factor readings use the shared measurement formats.
        expect(
          screen.getByText("612 km/s")
        ).toBeInTheDocument();
      }
    );


    it(
      "always carries the aurora caveat",
      async () => {
        render(<SpaceWeather />);

        const caveats = await screen.findByRole(
          "note",
          {
            name: "Limits of this data",
          }
        );

        expect(
          within(caveats).getByText(
            /does not establish whether aurora will be visible/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "keeps the current conditions when the risk assessment fails",
      async () => {
        mockedGetRisk.mockRejectedValue(
          new Error(UNREACHABLE)
        );

        render(<SpaceWeather />);

        // The solar wind and risk sections both depend on /risk.
        expect(
          await screen.findAllByText(UNREACHABLE)
        ).toHaveLength(2);

        expect(
          screen.getByText("5.33")
        ).toBeInTheDocument();
      }
    );


    it(
      "keeps the risk assessment when the current conditions fail",
      async () => {
        mockedGetCurrent.mockRejectedValue(
          new Error(UNREACHABLE)
        );

        render(<SpaceWeather />);

        // Current conditions and the explanation both depend on
        // /current.
        expect(
          await screen.findAllByText(UNREACHABLE)
        ).toHaveLength(2);

        expect(
          screen.getByText("moderate")
        ).toBeInTheDocument();
      }
    );
  }
);
