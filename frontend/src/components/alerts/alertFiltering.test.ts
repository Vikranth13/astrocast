import {
  describe,
  expect,
  it,
} from "vitest";

import {
  hasActiveFilters,
  readAlertFilters,
  readAlertPage,
  severityFamilyLabel,
} from "./alertFiltering";


const NO_FILTERS = {
  severity: null,
  type: null,
  status: null,
};


describe(
  "readAlertFilters",
  () => {
    it(
      "reads valid filters from the URL",
      () => {
        expect(
          readAlertFilters(
            new URLSearchParams(
              "severity=G1&type=warning&status=active"
            )
          )
        ).toEqual({
          severity: "G1",
          type: "warning",
          status: "active",
        });
      }
    );


    it(
      "ignores values the backend would reject",
      () => {
        expect(
          readAlertFilters(
            new URLSearchParams(
              "severity=Z9&type=rumour&status=maybe"
            )
          )
        ).toEqual(NO_FILTERS);
      }
    );
  }
);


describe(
  "readAlertPage",
  () => {
    it(
      "reads the page number from the URL",
      () => {
        expect(
          readAlertPage(
            new URLSearchParams("page=3")
          )
        ).toBe(3);
      }
    );


    it(
      "treats a missing or invalid page as the first",
      () => {
        for (const query of [
          "",
          "page=0",
          "page=-2",
          "page=two",
          "page=1.5",
        ]) {
          expect(
            readAlertPage(
              new URLSearchParams(query)
            )
          ).toBe(1);
        }
      }
    );
  }
);


describe(
  "hasActiveFilters",
  () => {
    it(
      "reports whether any filter is set",
      () => {
        expect(
          hasActiveFilters(NO_FILTERS)
        ).toBe(false);

        expect(
          hasActiveFilters({
            ...NO_FILTERS,
            type: "watch",
          })
        ).toBe(true);
      }
    );
  }
);


describe(
  "severityFamilyLabel",
  () => {
    it(
      "names the family from the scale letter",
      () => {
        expect(
          severityFamilyLabel("R2")
        ).toBe("Radio blackout");

        expect(
          severityFamilyLabel(null)
        ).toBeNull();
      }
    );
  }
);
