import {
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
} from "vitest";

import Learn from "./Learn";


describe(
  "Learn",
  () => {
    it(
      "explains every concept the roadmap lists",
      () => {
        render(<Learn />);

        for (const concept of [
          "Kp index",
          "Coronal mass ejection (CME)",
          "Solar flare",
          "Aurora",
          "Twilight",
          "Seeing",
          "Transparency",
          "Moonlight",
        ]) {
          expect(
            screen.getByRole(
              "heading",
              {
                level: 3,
                name: concept,
              }
            )
          ).toBeInTheDocument();
        }
      }
    );


    it(
      "says plainly what AstroCast cannot tell you",
      () => {
        render(<Learn />);

        expect(
          screen.getByText("Not forecast")
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /It does not forecast aurora for your location\./
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /one evening hour, 22:00 local time/
          )
        ).toBeInTheDocument();
      }
    );


    it(
      "names its data sources",
      () => {
        render(<Learn />);

        for (const source of [
          "NOAA Space Weather Prediction Center",
          "Open-Meteo",
        ]) {
          expect(
            screen.getByRole(
              "heading",
              {
                level: 3,
                name: source,
              }
            )
          ).toBeInTheDocument();
        }
      }
    );
  }
);
