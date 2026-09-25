import {
  ALERT_STATUSES,
  ALERT_TYPES,
  ALERT_SEVERITIES,
} from "../ui/severity";

import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  SEVERITY_FAMILIES,
  hasActiveFilters,
  type AlertFilterName,
  type AlertFilterState,
} from "./alertFiltering";

import "./alerts.css";

type AlertFiltersProps = {
  filters: AlertFilterState;
  onChange: (
    name: AlertFilterName,
    value: string
  ) => void;
  onClear: () => void;
};

function AlertFilters({
  filters,
  onChange,
  onClear,
}: AlertFiltersProps) {
  return (
    <div
      className="alert-filters"
      role="group"
      aria-label="Filter alerts"
    >
      <div className="alert-filter">
        <label htmlFor="alert-filter-severity">
          Severity
        </label>

        <select
          id="alert-filter-severity"
          value={filters.severity ?? ""}
          onChange={(event) =>
            onChange(
              "severity",
              event.target.value
            )
          }
        >
          <option value="">Any severity</option>

          {SEVERITY_FAMILIES.map((family) => (
            <optgroup
              key={family.prefix}
              label={family.label}
            >
              {ALERT_SEVERITIES
                .filter((code) =>
                  code.startsWith(family.prefix)
                )
                .map((code) => (
                  <option
                    key={code}
                    value={code}
                  >
                    {code}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="alert-filter">
        <label htmlFor="alert-filter-type">
          Type
        </label>

        <select
          id="alert-filter-type"
          value={filters.type ?? ""}
          onChange={(event) =>
            onChange(
              "type",
              event.target.value
            )
          }
        >
          <option value="">Any type</option>

          {ALERT_TYPES.map((type) => (
            <option
              key={type}
              value={type}
            >
              {ALERT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="alert-filter">
        <label htmlFor="alert-filter-status">
          Status
        </label>

        <select
          id="alert-filter-status"
          value={filters.status ?? ""}
          onChange={(event) =>
            onChange(
              "status",
              event.target.value
            )
          }
        >
          <option value="">Any status</option>

          {ALERT_STATUSES.map((status) => (
            <option
              key={status}
              value={status}
            >
              {ALERT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters(filters) && (
        <button
          type="button"
          className="alert-filters-clear"
          onClick={onClear}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export default AlertFilters;
