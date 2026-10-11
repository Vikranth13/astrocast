import {
  describe,
  expect,
  it,
} from "vitest";

import {
  filterAlerts,
  hasActiveFilters,
  readAlertFilters,
  severityFamilyLabel,
} from "./alertFiltering";

import {
  MOCK_ALERTS,
} from "../../data/mockSpaceWeather";


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
  "filterAlerts",
  () => {
    it(
      "returns everything with no filters",
      () => {
        expect(
          filterAlerts(
            MOCK_ALERTS,
            NO_FILTERS
          )
        ).toHaveLength(
          MOCK_ALERTS.length
        );
      }
    );


    it(
      "narrows by each filter and by combinations",
      () => {
        expect(
          filterAlerts(
            MOCK_ALERTS,
            {
              ...NO_FILTERS,
              severity: "G1",
            }
          ).map((alert) => alert.id)
        ).toEqual([7, 6]);

        expect(
          filterAlerts(
            MOCK_ALERTS,
            {
              ...NO_FILTERS,
              status: "expired",
            }
          ).map((alert) => alert.id)
        ).toEqual([4, 3, 1]);

        expect(
          filterAlerts(
            MOCK_ALERTS,
            {
              severity: "G1",
              type: null,
              status: "active",
            }
          ).map((alert) => alert.id)
        ).toEqual([7]);
      }
    );


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
