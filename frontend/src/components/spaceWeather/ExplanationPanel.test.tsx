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

import ExplanationPanel from "./ExplanationPanel";


describe(
  "ExplanationPanel",
  () => {
    it(
      "keeps caveats apart from the details",
      () => {
        render(
          <ExplanationPanel
            explanation={{
              summary: "Kp is 5.33.",
              details: [
                "The observation is 42 minutes old.",
              ],
              caveats: [
                "Kp alone cannot establish local aurora visibility.",
              ],
            }}
          />
        );

        expect(
          screen.getByText("Kp is 5.33.")
        ).toBeInTheDocument();

        const caveats = screen.getByRole(
          "note",
          {
            name: "Limits of this data",
          }
        );

        expect(
          within(caveats).getByText(
            "Kp alone cannot establish local aurora visibility."
          )
        ).toBeInTheDocument();

        expect(
          within(caveats).queryByText(
            "The observation is 42 minutes old."
          )
        ).not.toBeInTheDocument();
      }
    );


    it(
      "omits the caveat block when there are none",
      () => {
        render(
          <ExplanationPanel
            explanation={{
              summary: "A cancellation withdrew a watch.",
              details: [],
              caveats: [],
            }}
          />
        );

        expect(
          screen.queryByRole("note")
        ).not.toBeInTheDocument();
      }
    );
  }
);
