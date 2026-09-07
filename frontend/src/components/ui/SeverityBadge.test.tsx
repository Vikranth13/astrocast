import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import SeverityBadge from "./SeverityBadge";

import {
  toneForActivityLevel,
  toneForAlertStatus,
  toneForFreshness,
  toneForNoaaScale,
  toneForRiskLevel,
} from "./severity";


describe(
  "SeverityBadge",
  () => {
    it(
      "renders the label verbatim",
      () => {
        render(
          <SeverityBadge label="G3" />
        );

        expect(
          screen.getByText("G3")
        ).toBeInTheDocument();
      }
    );


    it(
      "applies the tone class",
      () => {
        render(
          <SeverityBadge
            label="G4"
            tone="critical"
          />
        );

        expect(
          screen.getByText("G4")
        ).toHaveClass(
          "ui-badge",
          "ui-badge-critical"
        );
      }
    );


    it(
      "leaves the quiet tone unmodified",
      () => {
        render(
          <SeverityBadge
            label="expired"
            tone="quiet"
          />
        );

        expect(
          screen.getByText("expired")
            .className
        ).toBe("ui-badge");
      }
    );
  }
);


describe(
  "tone mapping",
  () => {
    it(
      "reads the NOAA scale digit, not the family letter",
      () => {
        expect(
          toneForNoaaScale("G1")
        ).toBe("caution");

        expect(
          toneForNoaaScale("G3")
        ).toBe("warning");

        expect(
          toneForNoaaScale("R5")
        ).toBe("critical");

        expect(
          toneForNoaaScale("S4")
        ).toBe("critical");
      }
    );


    it(
      "falls back to quiet when there is no scale",
      () => {
        expect(
          toneForNoaaScale(null)
        ).toBe("quiet");
      }
    );


    it(
      "maps the other backend enumerations",
      () => {
        expect(
          toneForRiskLevel("severe")
        ).toBe("critical");

        expect(
          toneForActivityLevel(
            "below_storm"
          )
        ).toBe("quiet");

        expect(
          toneForFreshness("stale")
        ).toBe("warning");

        expect(
          toneForAlertStatus("active")
        ).toBe("info");
      }
    );
  }
);
